/**
 * Chatbot: MCP istemcisi olarak kendi MCP server'ımıza bağlanır, tool'ları Claude'a verir.
 * Tool sonuçlarındaki `ui_action` alanları önyüze yönlendirme komutu olarak döner.
 * ANTHROPIC_API_KEY yoksa (veya API hatası olursa) kural tabanlı Türkçe niyet çözücü devreye girer —
 * o da aynı MCP tool'larını çağırır, böylece demo her koşulda çalışır.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { all, get, run } from './db.js';
import { ROLE_LABEL, HttpError } from './auth.js';
import { STATUS_LABEL, PRIORITY_LABEL } from './services.js';

import {createHash,randomUUID} from 'node:crypto';
const READ_ONLY=new Set(['whoami','list_team_members','list_tasks','get_task','list_events','list_competencies','list_announcements','get_report','list_notifications','ui_navigate']);
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const hasClaudeCreds = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
let anthropic = null;
let betaSupported = true;
const getClient = () => (anthropic ??= new Anthropic({timeout:15000,maxRetries:0}));

async function connectMcp(token) {
  const port = process.env.PORT || 3001;
  const client = new Client({ name: 'syntra-chatbot', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  try {await client.connect(transport,{timeout:15000});} catch(e) {await client.close().catch(()=>{});throw e;}
  return client;
}

/** MCP tool çağrısı → { text, data, uiAction, isError } */
async function callTool(mcp, name, args) {
  const res = await mcp.callTool({ name, arguments: args || {} });
  const text = (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  let data = null;
  try { data = JSON.parse(text); } catch { /* düz metin */ }
  return { text, data, uiAction: data?.ui_action || null, isError: Boolean(res.isError) };
}

function systemPrompt(user) {
  return `Sen "SYNTRA Asistanı"sın: SYNTRA (Cybersecurity Intelligence & Team Orchestration) uygulamasında siber güvenlik ekiplerinin görev, etkinlik, yetkinlik, raporlama ve bildirim yönetimi yardımcısın.
Kullanıcı: ${user.name} — ${user.title}, ekip: ${user.team}, rol: ${ROLE_LABEL[user.role]} (${user.role}). Bugün: ${new Date().toISOString().slice(0, 10)}.

Çalışma şekli:
- Verilere sadece MCP tool'ları ile eriş; tahmin etme. Yetki hatası dönerse kullanıcıya rolünün bunu yapmaya izin vermediğini nazikçe söyle.
- Kullanıcı bir şeyi görmek istediğinde ("göster", "aç", "listele", "git", "rapor") veriyi çektikten sonra ui_navigate ile ilgili sayfayı uygun filtrelerle aç. Tek bir görev/etkinlik söz konusuysa highlight_id ver.
- Görev oluşturma/güncelleme sonrası da ui_navigate ile ilgili kaydı vurgula.
- Yanıtların Türkçe, kısa ve net olsun (en fazla birkaç cümle veya kısa madde listesi). Tool adlarından veya JSON'dan bahsetme.
- Tarihleri kullanıcı "yarın", "cuma" gibi söylerse bugüne göre YYYY-MM-DD'ye çevir.`;
}

async function runClaude(user, mcp, messages, trace, signal) {
  const { tools: mcpTools } = await mcp.listTools();
  const tools = mcpTools.map((t) => ({ name: t.name, description: t.description || '', input_schema: t.inputSchema }));
  const convo = messages.slice(-12).map((m) => ({ role: m.role, content: String(m.content) }));
  const {actions,toolCalls} = trace;

  for (let i = 0; i < 8; i++) {
    const base = {
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system: systemPrompt(user),
      tools,
      messages: convo,
    };
    let response;
    if (betaSupported) {
      try {
        // Sunucu tarafı fallback: güvenlik sınıflandırıcısı reddederse istek önerilen modelde yeniden çalışır
        response = await getClient().beta.messages.create({ ...base, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, {signal});
      } catch (e) {
        // Kurumsal gateway/proxy beta parametrelerini desteklemiyorsa bir kez sade istekle dene
        if (!(e instanceof Anthropic.BadRequestError)) throw e;
        console.warn('[chat] Beta parametreleri reddedildi, sade istekle devam ediliyor:', e.message);
        betaSupported = false;
      }
    }
    response ??= await getClient().messages.create(base,{signal});

    if (response.stop_reason === 'refusal') {
      return { reply: 'Bu isteği işleyemedim, farklı şekilde ifade edebilir misiniz?', actions, toolCalls };
    }
    convo.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'pause_turn') continue;
    const uses = response.content.filter((b) => b.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || uses.length === 0) {
      const reply = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { reply: reply || 'Tamam.', actions, toolCalls };
    }

    const results = [];
    for (const u of uses) {
      signal.throwIfAborted();
      const entry={name:u.name,input:u.input,ok:false,attempted:true};
      toolCalls.push(entry);
      const r=await callTool(mcp,u.name,u.input);
      entry.ok=!r.isError;
      if(r.uiAction)actions.push(r.uiAction);
      results.push({type:'tool_result',tool_use_id:u.id,content:r.text.slice(0,30000),is_error:r.isError});
    }
    convo.push({ role: 'user', content: results });
  }
  return { reply: 'İşlem çok uzun sürdü, isteği daraltabilir misiniz?', actions, toolCalls };
}

// ------------------------------------------------------------------ Kural tabanlı yedek mod
const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

function findPerson(text) {
  const t = norm(text);
  for (const u of all('SELECT id,name FROM users')) {
    const first = norm(u.name.split(' ')[0]);
    if (new RegExp(`\\b${first}`).test(t)) return u.name;
  }
  return null;
}

function fmtTasks(list, max = 6) {
  if (!list.length) return 'Kriterlere uyan görev bulunamadı.';
  const lines = list.slice(0, max).map((t) => `• #${t.id} ${t.title} — ${PRIORITY_LABEL[t.priority]}, ${STATUS_LABEL[t.status]}${t.assignee ? `, ${t.assignee}` : ''}${t.overdue ? ' ⚠ gecikmiş' : ''}`);
  return `${list.length} görev bulundu:\n${lines.join('\n')}${list.length > max ? `\n… ve ${list.length - max} görev daha (ekranda listelendi).` : ''}`;
}

async function runFallback(user, mcp, messages) {
  const raw = String(messages.filter((m) => m.role === 'user').at(-1)?.content || '');
  const q = norm(raw);
  const actions = [];
  const toolCalls = [];
  const call = async (name, args = {}) => {
    const r = await callTool(mcp, name, args);
    toolCalls.push({ name, input: args, ok: !r.isError });
    if (r.uiAction) actions.push(r.uiAction);
    if (r.isError) throw new Error(r.text.replace(/^Hata: /, ''));
    return r.data;
  };
  const go = (page, filters, highlight_id) => call('ui_navigate', { page, ...(filters ? { filters } : {}), ...(highlight_id ? { highlight_id } : {}) });

  try {
    // Görev durum güncelleme: "#12 tamamlandı", "12 numaralı görevi incelemeye al"
    const idMatch = raw.match(/#?(\d+)\s*(?:numarali|numaralı|nolu|no'lu|id'li)?/i);
    const statusWord = q.match(/tamamla|bitir|kapat|done|incelemeye|review|basla|devam|baslat|yapilacak/);
    if (idMatch && statusWord && /gorev|#|\d+ (numarali|nolu)/.test(q)) {
      const s = /tamamla|bitir|kapat|done/.test(statusWord[0]) ? 'done' : /inceleme|review/.test(statusWord[0]) ? 'review' : /yapilacak/.test(statusWord[0]) ? 'todo' : 'in_progress';
      const t = await call('update_task', { id: Number(idMatch[1]), status: s });
      await go('tasks', null, t.id);
      return { reply: `#${t.id} "${t.title}" görevinin durumu **${STATUS_LABEL[s]}** olarak güncellendi.`, actions, toolCalls };
    }

    // Görev oluşturma: "görev oluştur: Log analizi, Ayşe'ye ata, öncelik yüksek"
    const create = raw.match(/(?:g[öo]rev|task)\s*(?:olu[şs]tur|ekle|a[çc])\s*[:\-]?\s*(.+)/i);
    if (create) {
      let title = create[1];
      const person = findPerson(title);
      const prio = /kritik/.test(norm(title)) ? 'critical' : /yuksek/.test(norm(title)) ? 'high' : /dusuk/.test(norm(title)) ? 'low' : 'medium';
      const backup = /yedek/.test(norm(title));
      title = title.split(/,|\s+(?:ve\s+)?(?:\S+['’](?:y?[ae]|n[ae]))\s+ata/i)[0].replace(/\b(öncelik|oncelik)\s*\S+/i, '').trim();
      const t = await call('create_task', { title, priority: prio, ...(person ? { assignee: person } : {}), ...(backup ? { type: 'backup' } : {}) });
      await go('tasks', null, t.id);
      return { reply: `Görev oluşturuldu: #${t.id} "${t.title}" → ${t.assignee} (${PRIORITY_LABEL[t.priority]}). İlgili kişiye bildirim gönderildi.`, actions, toolCalls };
    }

    if (/(bildirim|ozet).*(gonder|yolla|at)|toplu bildirim/.test(q)) {
      const r = await call('send_digest_notifications');
      await go('reports');
      return { reply: `Toplu bildirim gönderildi: ${r.sent} kişiye görev özeti iletildi. Açık: ${r.totals.open}, gecikmiş: ${r.totals.overdue}.`, actions, toolCalls };
    }
    if (/rapor|istatistik|performans|ozet/.test(q)) {
      const r = await call('get_report', {});
      await go('reports');
      const top = [...r.per_user].sort((a, b) => b.overdue - a.overdue)[0];
      return {
        reply: `**${r.scope}** raporu: ${r.totals.total} görev, ${r.totals.open} açık, ${r.totals.done} tamamlandı (%${r.totals.completion_rate}). ` +
          `${r.totals.overdue} gecikmiş, ${r.totals.critical_open} kritik açık görev var.${top?.overdue ? ` En çok gecikmesi olan: ${top.name} (${top.overdue}).` : ''}`,
        actions, toolCalls,
      };
    }
    if (/yetkinlik|sertifika|skill|beceri|uzmanlik/.test(q)) {
      const person = findPerson(raw);
      const list = await call('list_competencies', person ? { user: person } : {});
      await go('competencies', person ? { search: person } : null);
      return { reply: list.slice(0, 4).map((u) => `• **${u.name}**: ${u.skills.slice(0, 3).join(', ')}${u.certifications.length ? ` | ${u.certifications.join(', ')}` : ''}`).join('\n'), actions, toolCalls };
    }
    if (/(^|[^y])etkinlik|konferans|ctf|egitim|webinar|meetup|sinav|zirve/.test(q)) {
      const type = /ctf/.test(q) ? 'ctf' : /konferans|zirve/.test(q) ? 'conference' : /egitim/.test(q) ? 'training' : /sinav/.test(q) ? 'exam' : undefined;
      const participation = /kurumsal/.test(q) ? 'corporate' : /bireysel/.test(q) ? 'individual' : undefined;
      const scope = /gecmis|katildigimiz|katilinan/.test(q) ? 'past' : 'upcoming';
      const list = await call('list_events', { scope, ...(type ? { type } : {}), ...(participation ? { participation } : {}) });
      await go('events', { scope, view:'list', ...(type ? { type } : {}), ...(participation ? { participation } : {}) });
      return { reply: list.length ? `${list.length} etkinlik:\n${list.slice(0, 5).map((e) => `• ${e.title} — ${e.start_date} (${e.participation === 'corporate' ? 'kurumsal' : 'bireysel'}, ${e.participants.length} katılımcı)`).join('\n')}` : 'Etkinlik bulunamadı.', actions, toolCalls };
    }
    if (/duyuru/.test(q)) {
      const list = await call('list_announcements');
      await go('announcements');
      return { reply: list.slice(0, 3).map((a) => `• **${a.title}** — ${a.author_name}`).join('\n') || 'Duyuru yok.', actions, toolCalls };
    }
    if (/bildirim/.test(q)) {
      await go('notifications');
      return { reply: 'Bildirimleriniz açıldı.', actions, toolCalls };
    }
    if (/entegrasyon|mcp|api|token/.test(q)) {
      await go('integrations');
      return { reply: 'API & MCP entegrasyon sayfası açıldı. Buradan kişisel token alıp Claude Desktop / Claude Code gibi MCP istemcilerini bağlayabilirsiniz.', actions, toolCalls };
    }
    if (/ekip|takim|kullanici|personel/.test(q) && !/gorev/.test(q)) {
      await go('team');
      return { reply: 'Ekip sayfası açıldı.', actions, toolCalls };
    }
    if (/ana sayfa|dashboard|panel|ozet ekran/.test(q)) {
      await go('dashboard');
      return { reply: 'Ana panele yönlendirildiniz.', actions, toolCalls };
    }
    if (/gorev|task|is(ler)?im|olay|incident|yedek|gecik|kritik|acik/.test(q)) {
      const f = {};
      if (/kritik/.test(q)) f.priority = 'critical';
      else if (/yuksek/.test(q)) f.priority = 'high';
      if (/gecik/.test(q)) f.overdue = true;
      if (/yedek/.test(q)) f.type = 'backup';
      if (/olay|incident/.test(q)) f.type = 'incident';
      if (/gunluk/.test(q)) f.type = 'daily';
      if (/incelemede|review/.test(q)) f.status = 'review';
      else if (/tamamlanan|biten/.test(q)) f.status = 'done';
      else if (/acik|bekleyen|devam/.test(q) || f.priority || f.overdue) f.status = 'open';
      if (/benim|bana|gorevlerim|islerim/.test(q)) f.mine = true;
      const person = findPerson(raw);
      if (person && !f.mine) f.assignee = person;
      const list = await call('list_tasks', f);
      await go('tasks', f);
      return { reply: fmtTasks(list), actions, toolCalls };
    }
  } catch (e) {
    return { reply: `⚠ ${e.message}`, actions, toolCalls };
  }
  return {
    reply: 'Şunları deneyebilirsiniz:\n• "Kritik açık görevleri göster"\n• "Gecikmiş görevlerim"\n• "Görev oluştur: WAF log analizi, Ayşe\'ye ata, öncelik yüksek"\n• "#2 numaralı görevi tamamla"\n• "Yaklaşan etkinlikler" / "CTF etkinlikleri"\n• "Ekip yetkinlikleri"\n• "Raporu göster" / "Toplu bildirim gönder"',
    actions, toolCalls,
  };
}

export async function chat(user, token, messages, requestId=randomUUID()) {
  const fingerprint=createHash('sha256').update(JSON.stringify(messages)).digest('hex');
  const existing=get('SELECT * FROM chat_requests WHERE user_id=? AND request_id=?',user.id,requestId);
  if(existing) {
    if(existing.fingerprint!==fingerprint)throw new HttpError(409,'Aynı istek kimliği farklı içerikle kullanılamaz');
    if(existing.result)return JSON.parse(existing.result);
    throw new HttpError(409,'Bu istek işlendi veya hâlen işleniyor. Tekrar göndermeden kayıtları kontrol edin.');
  }
  run("INSERT INTO chat_requests(user_id,request_id,fingerprint,status) VALUES (?,?,?,'processing')",user.id,requestId,fingerprint);
  const trace={actions:[],toolCalls:[]};
  const signal=AbortSignal.timeout(60000);
  let mcp;
  try {
    mcp=await connectMcp(token);
    let result;
    if(hasClaudeCreds()&&process.env.CHAT_MODE!=='rules') {
      try { result={mode:'claude',model:MODEL,...await runClaude(user,mcp,messages,trace,signal)}; }
      catch(e) {
        const wrote=trace.toolCalls.some(t=>t.attempted&&!READ_ONLY.has(t.name));
        if(wrote) result={mode:'claude',partial:true,reply:'İstek sırasında bağlantı kesildi. Bazı işlemler yapılmış olabilir; mükerrer kayıt oluşturmamak için işlemi tekrarlamadım. İlgili kayıtları kontrol edin.',...trace};
        else if(e instanceof Anthropic.APIError||e instanceof Anthropic.APIConnectionError||signal.aborted) console.warn('[chat] Kural moduna geçiliyor:',e.name);
        else throw e;
      }
    }
    result??={mode:'rules',...await runFallback(user,mcp,messages)};
    run("UPDATE chat_requests SET status='completed',result=? WHERE user_id=? AND request_id=?",JSON.stringify(result),user.id,requestId);
    return result;
  } catch(e) {
    run("UPDATE chat_requests SET status='failed' WHERE user_id=? AND request_id=?",user.id,requestId);
    throw e;
  } finally {if(mcp)await mcp.close().catch(()=>{});}
}
