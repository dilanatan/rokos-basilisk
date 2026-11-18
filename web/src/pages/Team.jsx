import {RequestState} from '../components/RequestState.jsx';
import { api } from '../api.js';
import { useAuth, useLive, ROLE_LABEL } from '../auth.jsx';
import { Card, PageHeader, Avatar, Select, Badge, cx, fmtDateTime, Button } from '../components/ui.jsx';

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
  const request=useLive('/users',['users']);
  const {data:users}=request;
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
      <RequestState {...request}/>
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
                    ? <Select className="w-40" value={u.manager_id || ''} onChange={(e) => change(u, { manager_id: e.target.value?Number(e.target.value):null })} options={[['','Yönetici yok'],...managers.filter((m) => m.id !== u.id).map((m) => [m.id, m.name])]} />
                    : <span className="text-slate-400">{u.manager_name || '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {user.role==='director'&&<AuditLog/>}
    </div>
  );
}

function AuditLog() {
  const request=useLive('/audit',['tasks','users','events','competencies','announcements']);
  const labels={createTask:'Görev oluşturdu',updateTask:'Görevi güncelledi',deleteTask:'Görevi sildi',addComment:'Yorum ekledi',updateUserRole:'Yetkiyi güncelledi',createEvent:'Etkinlik oluşturdu',updateEvent:'Etkinliği güncelledi',joinEvent:'Etkinliğe kayıt yaptı',leaveEvent:'Katılımı iptal etti',updateAttendance:'Katılım durumunu güncelledi',upsertSkill:'Yetkinlik kaydetti',deleteSkill:'Yetkinlik sildi',addCertification:'Sertifika ekledi',updateCertification:'Sertifikayı güncelledi',deleteCertification:'Sertifika sildi',createAnnouncement:'Duyuru yayınladı',sendDigest:'Toplu bildirim gönderdi',markNotificationsRead:'Bildirimleri okundu işaretledi'};
  return <Card title="İşlem geçmişi · son 100 işlem" className="mt-4" action={<Button variant="ghost" onClick={request.reload}>Yenile</Button>}><RequestState {...request}/><div className="max-h-80 overflow-auto">{request.data?.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-800 py-2 text-xs"><span><b>{item.actor_name}</b> · {labels[item.action]||'Kayıt güncellendi'}{JSON.parse(item.details).record_id?' · #'+JSON.parse(item.details).record_id:''}</span><span className="text-slate-500">{fmtDateTime(item.created_at)}</span></div>)}</div></Card>;
}
