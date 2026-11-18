import { useState } from 'react';
import { KeyRound, Copy, Check, Plug, Bot, Terminal } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, Button, PageHeader, Badge } from '../components/ui.jsx';

const ENDPOINTS = [
  ['GET', '/api/tasks', 'Görevleri listele (status, priority, type, assignee, overdue, mine, search)'],
  ['POST', '/api/tasks', 'Görev oluştur / ata'],
  ['PATCH', '/api/tasks/:id', 'Durum, öncelik, atama, yedek sorumlu güncelle'],
  ['POST', '/api/tasks/:id/comments', 'Göreve yorum ekle'],
  ['GET', '/api/events', 'Etkinlikler (scope, type, participation)'],
  ['POST', '/api/events/:id/join', 'Etkinliğe katıl'],
  ['GET', '/api/competencies', 'Yetkinlik, sertifika, etkinlik geçmişi'],
  ['GET', '/api/reports/summary', 'Toplu rapor (yönetici+)'],
  ['GET', '/api/reports/tasks.csv', 'CSV dışa aktarma (yönetici+)'],
  ['POST', '/api/reports/digest', 'Toplu bildirim gönder (yönetici+)'],
  ['GET', '/api/notifications/stream', 'Canlı bildirim akışı (SSE)'],
  ['POST', '/mcp', 'MCP Streamable HTTP endpoint (19 tool)'],
];
const TOOLS = ['whoami', 'list_team_members', 'list_tasks', 'get_task', 'create_task', 'update_task', 'add_task_comment', 'list_events', 'create_event', 'join_event', 'list_competencies', 'add_skill', 'add_certification', 'list_announcements', 'create_announcement', 'get_report', 'send_digest_notifications', 'list_notifications', 'ui_navigate'];
const METHOD_TONE = { GET: 'bg-emerald-500/15 text-emerald-300', POST: 'bg-cyan-500/15 text-cyan-300', PATCH: 'bg-amber-500/15 text-amber-300' };

function CopyBlock({ text }) {
  const [done, setDone] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">{text}</pre>
      <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }} className="absolute right-2 top-2 rounded bg-slate-800 p-1.5 text-slate-400 hover:text-white">
        {done ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function Integrations() {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const origin = window.location.origin.replace(':5173', ':3001');
  const t = token || '<TOKEN>';
  const claudeCode = `claude mcp add --transport http cyberops ${origin}/mcp \\\n  --header "Authorization: Bearer ${t}"`;
  const desktop = JSON.stringify({ mcpServers: { cyberops: { type: 'http', url: `${origin}/mcp`, headers: { Authorization: `Bearer ${t}` } } } }, null, 2);
  const curl = `curl -H "Authorization: Bearer ${t}" ${origin}/api/tasks?status=open&priority=critical`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Veri Paylaşımı: API & MCP" subtitle="Aynı veri ve yetki modeli REST API ve Model Context Protocol üzerinden dış sistemlere açılır" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <KeyRound className="text-cyan-400" />
            <div className="flex-1">
              <div className="font-semibold">Kişisel API / MCP token</div>
              <div className="text-xs text-slate-400">{user.name} kimliğiyle ve <b>{user.role}</b> yetkisiyle çalışır. 30 gün geçerli.</div>
            </div>
            <Button onClick={async () => setToken((await api('/me/api-token', { method: 'POST' })).token)}>Token oluştur</Button>
          </div>
          {token && <div className="mt-3"><CopyBlock text={token} /></div>}
        </Card>

        <Card title={<span className="flex items-center gap-2"><Plug size={15} />Mimari</span>} className="lg:col-span-3">
          <div className="grid gap-3 text-center text-xs md:grid-cols-5">
            {[
              ['Önyüz (React)', 'Sayfalar + Chat widget'],
              ['Chat API', 'Claude + tool-use döngüsü'],
              ['MCP Server', '19 tool · ui_navigate'],
              ['Servis katmanı', 'RBAC: çalışan / yönetici / direktör'],
              ['SQLite', 'Görev · etkinlik · yetkinlik · bildirim'],
            ].map(([a, b], i) => (
              <div key={a} className="relative rounded-lg border border-slate-700 bg-slate-950 p-3">
                <div className="font-semibold text-cyan-300">{a}</div><div className="mt-1 text-slate-400">{b}</div>
                {i < 4 && <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-600 md:block">→</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Chatbot, MCP istemcisi olarak bu sunucuya bağlanır. <code className="text-emerald-300">ui_navigate</code> tool'unun sonucu önyüze geri döner ve React Router ile sayfa + filtre uygulanır.
            Harici MCP istemcileri (Claude Desktop, Claude Code, IDE ajanları) aynı tool'ları aynı yetki kurallarıyla kullanır.
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Terminal size={15} />Claude Code</span>}><CopyBlock text={claudeCode} /></Card>
        <Card title={<span className="flex items-center gap-2"><Bot size={15} />Claude Desktop / MCP config</span>}><CopyBlock text={desktop} /></Card>
        <Card title="REST (curl)"><CopyBlock text={curl} /></Card>

        <Card title="REST endpoint'leri" className="lg:col-span-2">
          <table className="w-full text-sm">
            <tbody>
              {ENDPOINTS.map(([m, p, d]) => (
                <tr key={m + p} className="border-t border-slate-800/60">
                  <td className="w-16 py-1.5"><Badge className={METHOD_TONE[m]}>{m}</Badge></td>
                  <td className="font-mono text-xs text-slate-200">{p}</td>
                  <td className="text-xs text-slate-400">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="MCP tool'ları">
          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map((tl) => <span key={tl} className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${tl === 'ui_navigate' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>{tl}</span>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
