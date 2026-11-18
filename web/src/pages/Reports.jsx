import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Send, ListChecks, AlertTriangle, Flame, CheckCircle2, Percent } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { api, download } from '../api.js';
import { useAuth, useLive } from '../auth.jsx';
import { Card, Button, Stat, PageHeader, PriorityBadge, Select, STATUS, PRIORITY, TYPE, fmtDate } from '../components/ui.jsx';

const STATUS_COLOR = { todo: '#64748b', in_progress: '#38bdf8', review: '#a78bfa', done: '#34d399' };
const PRIORITY_COLOR = { low: '#94a3b8', medium: '#fbbf24', high: '#f97316', critical: '#ef4444' };
const tip = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#e2e8f0' } };

export default function Reports() {
  const { user } = useAuth();
  const [team, setTeam] = useState('');
  const { data: r } = useLive(`/reports/summary${team ? `?team=${encodeURIComponent(team)}` : ''}`, ['tasks']);
  const [msg, setMsg] = useState('');
  if (!r) return null;

  const statusData = Object.entries(r.by_status).map(([k, v]) => ({ name: STATUS[k].label, value: v, key: k }));
  const prioData = ['critical', 'high', 'medium', 'low'].map((k) => ({ name: PRIORITY[k].label, value: r.by_priority[k] || 0, key: k }));
  const typeData = Object.entries(r.by_type).map(([k, v]) => ({ name: TYPE[k], value: v }));

  const digest = async () => {
    const res = await api('/reports/digest', { method: 'POST' });
    setMsg(`✓ ${res.sent} kişiye görev özeti bildirimi gönderildi.`);
    setTimeout(() => setMsg(''), 5000);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Raporlama & Bildirim" subtitle={`Kapsam: ${r.scope} · ${new Date(r.generated_at).toLocaleString('tr-TR')}`}>
        {user.role === 'director' && (
          <Select className="w-48" value={team} onChange={(e) => setTeam(e.target.value)} options={[['', 'Tüm organizasyon'], ['SOC', 'SOC'], ['Ofansif', 'Ofansif Güvenlik']]} />
        )}
        <Button variant="ghost" onClick={() => download('/reports/tasks.csv', `gorev-raporu-${new Date().toISOString().slice(0, 10)}.csv`)}><Download size={16} /> CSV / Excel</Button>
        <Button onClick={digest}><Send size={16} /> Toplu bildirim gönder</Button>
      </PageHeader>
      {msg && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Toplam görev" value={r.totals.total} icon={ListChecks} />
        <Stat label="Açık" value={r.totals.open} icon={ListChecks} tone="violet" />
        <Stat label="Gecikmiş" value={r.totals.overdue} icon={AlertTriangle} tone="red" />
        <Stat label="Kritik açık" value={r.totals.critical_open} icon={Flame} tone="amber" />
        <Stat label="Tamamlanma oranı" value={`%${r.totals.completion_rate}`} icon={Percent} tone="emerald" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Durum dağılımı">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {statusData.map((d) => <Cell key={d.key} fill={STATUS_COLOR[d.key]} stroke="none" />)}
              </Pie>
              <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Öncelik dağılımı">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prioData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip {...tip} cursor={{ fill: '#1e293b' }} />
              <Bar dataKey="value" name="Görev" radius={[4, 4, 0, 0]}>{prioData.map((d) => <Cell key={d.key} fill={PRIORITY_COLOR[d.key]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Görev türleri">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} layout="vertical">
              <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} /><YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip {...tip} cursor={{ fill: '#1e293b' }} /><Bar dataKey="value" name="Görev" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Son 14 gün: oluşturulan vs tamamlanan">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={r.trend}>
              <CartesianGrid stroke="#1e293b" /><XAxis dataKey="date" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="linear" dataKey="created" name="Oluşturulan" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="linear" dataKey="completed" name="Tamamlanan" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Kişi bazlı iş yükü">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={r.per_user.map((u) => ({ ...u, name: u.name.split(' ')[0], active: u.open - u.overdue }))}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip {...tip} cursor={{ fill: '#1e293b' }} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="done" name="Tamamlanan" stackId="a" fill="#34d399" />
              <Bar dataKey="active" name="Açık" stackId="a" fill="#38bdf8" />
              <Bar dataKey="overdue" name="Gecikmiş" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Ekip özeti" className="lg:col-span-1">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500"><tr><th className="text-left">Ekip</th><th>Toplam</th><th>Açık</th><th>Gecikmiş</th><th>Biten</th></tr></thead>
            <tbody>{r.teams.map((t) => <tr key={t.team} className="border-t border-slate-800 text-center"><td className="py-2 text-left">{t.team}</td><td>{t.total}</td><td className="text-sky-300">{t.open}</td><td className="text-red-300">{t.overdue}</td><td className="text-emerald-300">{t.done}</td></tr>)}</tbody>
          </table>
          {r.event_stats.length > 0 && (
            <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
              <div className="mb-1 font-semibold text-slate-300">Etkinlik katılımı</div>
              {r.event_stats.map((e) => <div key={e.participation}>{e.participation === 'corporate' ? 'Kurumsal' : 'Bireysel'}: {e.events} etkinlik, {e.participants} katılım</div>)}
            </div>
          )}
        </Card>
        <Card title={<span className="flex items-center gap-1.5 text-red-300"><AlertTriangle size={15} />Gecikmiş görevler</span>} className="lg:col-span-2">
          {r.overdue_tasks.length ? (
            <ul className="divide-y divide-slate-800">
              {r.overdue_tasks.map((t) => (
                <li key={t.id}><Link to={`/tasks?highlight=${t.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-slate-800/40">
                  <span className="font-mono text-xs text-slate-500">#{t.id}</span><span className="flex-1">{t.title}</span>
                  <span className="text-slate-400">{t.assignee}</span><PriorityBadge p={t.priority} /><span className="text-red-400">{fmtDate(t.due_date)}</span>
                </Link></li>
              ))}
            </ul>
          ) : <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Gecikmiş görev yok</div>}
          {r.expiring_certs.length > 0 && (
            <div className="mt-3 border-t border-slate-800 pt-2 text-xs text-amber-300">Süresi dolacak sertifikalar: {r.expiring_certs.map((c) => `${c.user_name} – ${c.name} (${fmtDate(c.expires_at)})`).join(', ')}</div>
          )}
        </Card>
      </div>
    </div>
  );
}
