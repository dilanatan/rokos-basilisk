import { api } from '../api.js';
import { useAuth, useLive, ROLE_LABEL } from '../auth.jsx';
import { Card, PageHeader, Avatar, Select, Badge, cx } from '../components/ui.jsx';

const MATRIX = [
  ['Kendi görevlerini görme / durum güncelleme', true, true, true],
  ['Etkinliğe katılım, yetkinlik profili düzenleme', true, true, true],
  ['Ekibe görev atama, yedek sorumlu belirleme', false, true, true],
  ['Etkinlik oluşturma, ekip üyesini etkinliğe kaydetme', false, true, true],
  ['Ekip raporları, CSV dışa aktarma, toplu bildirim', false, true, true],
  ['Ekip duyurusu yayınlama', false, true, true],
  ['Tüm organizasyonu görme, ekipler arası atama', false, false, true],
  ['Rol / yetki yönetimi', false, false, true],
];

export default function Team() {
  const { user } = useAuth();
  const { data: users } = useLive('/users', ['users']);
  const managers = users?.filter((u) => u.role !== 'employee') || [];
  const change = (u, body) => api(`/users/${u.id}`, { method: 'PATCH', body }).catch((e) => alert(e.message));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Ekip & Yetkilendirme" subtitle="Çalışan → Yönetici → Direktör hiyerarşik yetki modeli" />
      <Card title="Yetki matrisi" className="mb-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr><th className="text-left">Yetenek</th>{['employee', 'manager', 'director'].map((r) => <th key={r} className={cx('w-28', user.role === r && 'text-cyan-300')}>{ROLE_LABEL[r]}</th>)}</tr>
          </thead>
          <tbody>
            {MATRIX.map(([label, ...v]) => (
              <tr key={label} className="border-t border-slate-800">
                <td className="py-2">{label}</td>
                {v.map((ok, i) => <td key={i} className="text-center">{ok ? <span className="text-emerald-400">✓</span> : <span className="text-slate-700">—</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-xs text-slate-500">Aynı kurallar REST API, MCP tool ve chatbot katmanlarında da uygulanır (tek servis katmanı).</div>
      </Card>
      <Card title="Organizasyon">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th className="py-2">Kişi</th><th>Ekip</th><th>Rol</th><th>Yönetici</th></tr></thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-slate-800">
                <td className="py-2">
                  <div className="flex items-center gap-2"><Avatar name={u.name} size={7} /><div><div className="font-medium">{u.name}</div><div className="text-xs text-slate-500">{u.title}</div></div></div>
                </td>
                <td className="text-slate-300">{u.team}</td>
                <td>
                  {user.role === 'director' && u.id !== user.id
                    ? <Select className="w-32" value={u.role} onChange={(e) => change(u, { role: e.target.value })} options={Object.entries(ROLE_LABEL)} />
                    : <Badge className={u.role === 'director' ? 'bg-fuchsia-500/15 text-fuchsia-300' : u.role === 'manager' ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'}>{ROLE_LABEL[u.role]}</Badge>}
                </td>
                <td>
                  {user.role === 'director' && u.role !== 'director'
                    ? <Select className="w-40" value={u.manager_id || ''} onChange={(e) => change(u, { manager_id: Number(e.target.value) })} options={managers.filter((m) => m.id !== u.id).map((m) => [m.id, m.name])} />
                    : <span className="text-slate-400">{u.manager_name || '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
