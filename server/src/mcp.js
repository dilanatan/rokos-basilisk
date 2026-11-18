/**
 * MCP Server (Streamable HTTP, stateless) — POST /mcp
 * Kimlik: Authorization: Bearer <token>. Her istek kullanıcının rol kapsamıyla çalışır.
 * Hem uygulama içi chatbot hem de harici MCP istemcileri (Claude Desktop, Claude Code, vb.) bağlanır.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import * as svc from './services.js';
import { userFromToken, bearer } from './auth.js';

export const UI_PAGES = {
  dashboard: '/',
  tasks: '/tasks',
  events: '/events',
  competencies: '/competencies',
  reports: '/reports',
  announcements: '/announcements',
  team: '/team',
  integrations: '/integrations',
  notifications: '/notifications',
};

const status = z.enum(['todo', 'in_progress', 'review', 'done']);
const priority = z.enum(['low', 'medium', 'high', 'critical']);
const taskType = z.enum(['daily', 'backup', 'project', 'incident']);
const eventType = z.enum(['conference', 'training', 'ctf', 'webinar', 'meetup', 'exam']);

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 1) }] };
}
function wrap(fn) {
  return async (args) => {
    try {
      return ok(await fn(args || {}));
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Hata: ${e.message}` }] };
    }
  };
}
/** Listeleri LLM bağlamı için sadeleştir. */
const slimTask = (t) => ({
  id: t.id, title: t.title, type: t.type, category: t.category, priority: t.priority, status: t.status,
  assignee: t.assignee_name, backup: t.backup_name, due_date: t.due_date, overdue: !!t.overdue,
});

export function createMcpServer(user) {
  const server = new McpServer({ name: 'cyberops-mcp', version: '1.0.0' });
  const tool = (name, description, inputSchema, fn, annotations = {}) =>
    server.registerTool(name, { description, inputSchema, annotations }, wrap(fn));

  // ---------- Kimlik
  tool('whoami', 'Oturumdaki kullanıcıyı, rolünü (employee/manager/director) ve ekibini döndürür.', {}, () => ({
    ...user, today: new Date().toISOString().slice(0, 10),
  }), { readOnlyHint: true });

  tool('list_team_members', 'Organizasyondaki kullanıcıları listeler (isim, rol, ekip, ünvan, yönetici).', {}, () =>
    svc.listUsers(user).map(({ id, name, role, team, title, manager_name }) => ({ id, name, role, team, title, manager_name })),
  { readOnlyHint: true });

  // ---------- Görevler
  tool('list_tasks', 'Görevleri filtreleyerek listeler. Kullanıcının rol kapsamına göre (çalışan: kendi, yönetici: ekibi, direktör: tümü) sonuç döner.', {
    status: z.enum(['todo', 'in_progress', 'review', 'done', 'open']).optional().describe("'open' = tamamlanmamış tümü"),
    priority: priority.optional(),
    type: taskType.optional().describe('daily=günlük, backup=yedek, project=proje, incident=olay'),
    category: z.string().optional(),
    assignee: z.string().optional().describe('Kişi adı veya id'),
    mine: z.boolean().optional().describe('Sadece bana atananlar'),
    overdue: z.boolean().optional(),
    search: z.string().optional(),
  }, (a) => svc.listTasks(user, a).map(slimTask), { readOnlyHint: true });

  tool('get_task', 'Tek bir görevin detayını ve yorumlarını getirir.', { id: z.number().int() }, ({ id }) => svc.getTask(user, id), { readOnlyHint: true });

  tool('create_task', 'Yeni görev oluşturur ve atar. Yönetici ekibine, direktör herkese atayabilir; çalışan sadece kendine.', {
    title: z.string(),
    description: z.string().optional(),
    type: taskType.optional(),
    category: z.string().optional().describe('ör. SOC, Olay Müdahale, Sızma Testi, Zafiyet Yönetimi, GRC'),
    priority: priority.optional(),
    assignee: z.string().optional().describe('Kişi adı veya id; boşsa kendine'),
    backup_assignee: z.string().optional().describe('Yedek sorumlu adı veya id'),
    due_date: z.string().optional().describe('YYYY-MM-DD'),
    recurrence: z.enum(['none', 'daily', 'weekly']).optional(),
  }, (a) => slimTask(svc.createTask(user, a)));

  tool('update_task', 'Görevin durumunu, önceliğini, atamasını veya bitiş tarihini günceller.', {
    id: z.number().int(),
    status: status.optional(),
    priority: priority.optional(),
    assignee: z.string().optional(),
    backup_assignee: z.string().optional(),
    due_date: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }, ({ id, ...patch }) => slimTask(svc.updateTask(user, id, patch)));

  tool('add_task_comment', 'Göreve yorum ekler (ilgili kişilere bildirim gider).', { id: z.number().int(), body: z.string() },
    ({ id, body }) => svc.addComment(user, id, body).comments.slice(-3));

  // ---------- Etkinlikler & yetkinlik
  tool('list_events', 'Etkinlikleri (konferans, eğitim, CTF, webinar, meetup, sınav) ve katılımcılarını listeler.', {
    scope: z.enum(['upcoming', 'past', 'all']).optional(),
    type: eventType.optional(),
    participation: z.enum(['individual', 'corporate']).optional().describe('bireysel / kurumsal'),
  }, (a) => svc.listEvents(user, a).map((e) => ({
    id: e.id, title: e.title, type: e.type, participation: e.participation, start_date: e.start_date, end_date: e.end_date,
    location: e.location, joined: e.joined, participants: e.participants.map((p) => `${p.name} (${p.role})`),
  })), { readOnlyHint: true });

  tool('create_event', 'Yeni etkinlik oluşturur (yönetici+).', {
    title: z.string(), type: eventType, participation: z.enum(['individual', 'corporate']).optional(),
    start_date: z.string(), end_date: z.string().optional(), location: z.string().optional(), description: z.string().optional(),
  }, (a) => svc.createEvent(user, a));

  tool('join_event', 'Etkinliğe kayıt olur. Yönetici ekibinden birini de kaydedebilir.', {
    event_id: z.number().int(), role: z.enum(['attendee', 'speaker', 'organizer']).optional(), user: z.string().optional(),
  }, ({ event_id, role, user: target }) => svc.joinEvent(user, event_id, role, target));

  tool('list_competencies', 'Yetkinlik (skill seviyeleri 1-5), sertifika ve etkinlik geçmişini listeler. Rol kapsamına göre.', {
    user: z.string().optional().describe('Belirli bir kişi'),
  }, (a) => svc.listCompetencies(user, a).map((u) => ({
    name: u.name, team: u.team, title: u.title,
    skills: u.skills.map((s) => `${s.name}: ${s.level}/5`),
    certifications: u.certifications.map((c) => `${c.name}${c.expires_at ? ` (bitiş ${c.expires_at})` : ''}${c.expiring ? ' ⚠' : ''}`),
    events: u.events.map((e) => e.title),
  })), { readOnlyHint: true });

  tool('add_skill', 'Kullanıcıya yetkinlik ekler/günceller (seviye 1-5).', {
    name: z.string(), level: z.number().int().min(1).max(5), category: z.string().optional(), user: z.string().optional(),
  }, (a) => svc.upsertSkill(user, a));

  tool('add_certification', 'Kullanıcıya sertifika ekler.', {
    name: z.string(), issuer: z.string().optional(), expires_at: z.string().optional(), user: z.string().optional(),
  }, (a) => svc.addCertification(user, a));

  // ---------- İletişim, rapor, bildirim
  tool('list_announcements', 'Duyuruları listeler.', {}, () => svc.listAnnouncements(user), { readOnlyHint: true });
  tool('create_announcement', 'Ekibe/organizasyona duyuru yayınlar ve bildirim gönderir (yönetici+).', {
    title: z.string(), body: z.string(), audience: z.string().optional().describe("'all' veya ekip adı (sadece direktör)"),
  }, (a) => svc.createAnnouncement(user, a));

  tool('get_report', 'Toplu görev raporu: durum/öncelik dağılımı, kişi ve ekip bazlı performans, gecikmiş görevler, 14 günlük trend (yönetici+).', {
    team: z.string().optional(),
  }, (a) => {
    const r = svc.reportSummary(user, a);
    return { scope: r.scope, totals: r.totals, by_status: r.by_status, by_priority: r.by_priority, teams: r.teams, per_user: r.per_user, overdue_tasks: r.overdue_tasks, expiring_certs: r.expiring_certs };
  }, { readOnlyHint: true });

  tool('send_digest_notifications', 'Ekipteki herkese açık/gecikmiş görev özetini bildirim olarak gönderir (yönetici+).', {}, () => svc.sendDigest(user));

  tool('list_notifications', 'Kullanıcının bildirimlerini listeler.', { unread: z.boolean().optional() }, (a) =>
    svc.listNotifications(user, a).slice(0, 15), { readOnlyHint: true });

  // ---------- Önyüz yönlendirme
  tool('ui_navigate',
    'Uygulama arayüzünü (önyüz) belirtilen sayfaya yönlendirir ve filtre uygular. Kullanıcı bir şeyi "göster/aç/git" dediğinde veya sonucu ekranda görmesi faydalıysa çağır. ' +
    'Sayfalar: dashboard, tasks, events, competencies, reports, announcements, team, integrations, notifications.',
    {
      page: z.enum(Object.keys(UI_PAGES)),
      filters: z.object({
        status: z.string().optional(), priority: z.string().optional(), type: z.string().optional(),
        assignee: z.string().optional(), overdue: z.boolean().optional(), mine: z.boolean().optional(),
        search: z.string().optional(), scope: z.string().optional(), view: z.enum(['list', 'board']).optional(),
      }).optional(),
      highlight_id: z.number().int().optional().describe('Vurgulanacak/açılacak kayıt id (görev veya etkinlik)'),
    },
    ({ page, filters = {}, highlight_id }) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
      if (highlight_id) qs.set('highlight', String(highlight_id));
      const path = UI_PAGES[page] + (qs.toString() ? `?${qs}` : '');
      return { ui_action: { type: 'navigate', path }, message: `Arayüz ${path} adresine yönlendirildi.` };
    });

  return server;
}

export async function mcpHandler(req, res) {
  const user = userFromToken(bearer(req));
  if (!user) return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized: Bearer token gerekli' }, id: null });
  const server = createMcpServer(user);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
