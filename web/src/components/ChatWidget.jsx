import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Send, X, Wrench, Sparkles, Navigation, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth, isManager } from '../auth.jsx';
import { cx } from './ui.jsx';

const SUGGEST_EMP = ['Görevlerimi göster', 'Gecikmiş görevlerim', 'Yaklaşan etkinlikler', 'Yetkinliklerim'];
const SUGGEST_MGR = ['Kritik açık görevleri göster', 'Raporu göster', "Görev oluştur: WAF log analizi, Ayşe'ye ata, öncelik yüksek", 'Toplu bildirim gönder', 'Ekip yetkinlikleri', 'Yedek görevler'];

/** Basit **kalın** ve satır sonu desteği */
function Rich({ text }) {
  return text.split('\n').map((line, i) => (
    <div key={i}>{line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith('**') ? <b key={j} className="text-slate-50">{p.slice(2, -2)}</b> : p))}</div>
  ));
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const nav = useNavigate();
  const loc = useLocation();
  const endRef = useRef(null);
  const requestRef=useRef(null);
  useEffect(()=>()=>requestRef.current?.abort(),[]);

  useEffect(() => {
    setMsgs([{ role: 'assistant', content: `Merhaba ${user.name.split(' ')[0]}! Ben SYNTRA Asistanı. Görevleri, etkinlikleri, yetkinlikleri ve raporları sorabilir; "göster" dediğinizde ilgili ekranı sizin için açarım.` }]);
  }, [user.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    const history = [...msgs, { role: 'user', content }];
    setMsgs(history);
    setBusy(true);
    const controller=new AbortController();requestRef.current=controller;
    try {
      const payload = history.filter((m, i) => i > 0 && (m.role === 'user' || m.role === 'assistant')).map(({ role, content }) => ({ role, content })).slice(-12);
      if(payload[0]?.role==='assistant')payload.shift();
      const r = await api('/chat', { method: 'POST', signal:controller.signal, body: { messages: payload, page: loc.pathname, requestId:crypto.randomUUID() } });
      if(controller.signal.aborted)return;
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply, tools: r.toolCalls, actions: r.actions, mode: r.mode }]);
      // MCP ui_navigate → önyüz yönlendirmesi
      const last = r.actions?.filter((a) => a.type === 'navigate').at(-1);
      if (last) nav(last.path);
    } catch (e) {
      if(controller.signal.aborted)return;
      setMsgs((m) => [...m, { role: 'assistant', content: `⚠ ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = isManager(user) ? SUGGEST_MGR : SUGGEST_EMP;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:scale-105 transition">
          <Bot size={20} /> Asistan <kbd className="hidden rounded bg-slate-950/20 px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
        </button>
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-40 flex h-[min(640px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-300"><Bot size={18} /></div>
              <div>
                <div className="text-sm font-semibold">SYNTRA Asistanı</div>
                <div className="text-[11px] text-slate-400">MCP ile bağlı · {user.role === 'director' ? 'Direktör' : user.role === 'manager' ? 'Yönetici' : 'Çalışan'} yetkisiyle</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed', m.role === 'user' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200')}>
                  <Rich text={m.content} />
                  {(m.tools?.length > 0 || m.mode) && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-700/60 pt-1.5">
                      {m.mode && (
                        <span className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]', m.mode === 'claude' ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-slate-700 text-slate-300')}>
                          <Sparkles size={10} />{m.mode === 'claude' ? 'Claude' : 'Kural motoru'}
                        </span>
                      )}
                      {m.tools?.map((t, j) => (
                        <span key={j} title={JSON.stringify(t.input)} className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px]', t.name === 'ui_navigate' ? 'bg-emerald-500/15 text-emerald-300' : t.ok ? 'bg-cyan-500/10 text-cyan-300' : 'bg-red-500/15 text-red-300')}>
                          {t.name === 'ui_navigate' ? <Navigation size={10} /> : <Wrench size={10} />}{t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> MCP tool'ları çalıştırılıyor…</div>}
            <div ref={endRef} />
          </div>

          {msgs.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500 hover:text-cyan-300">{s}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-slate-800 p-3">
            <input autoFocus maxLength={4000} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Bir şey sorun veya komut verin…"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
            <button disabled={busy || !input.trim()} className="rounded-xl bg-cyan-500 px-3 text-slate-950 disabled:opacity-40"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}
