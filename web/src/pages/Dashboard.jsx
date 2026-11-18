import {RequestState} from '../components/RequestState.jsx';
import { Link } from 'react-router-dom';
import { ListChecks, AlertTriangle, Flame, LifeBuoy, CheckCircle2, CalendarDays, Megaphone, Users } from 'lucide-react';
import { useAuth, useLive } from '../auth.jsx';
import { Card, Stat, PageHeader, PriorityBadge, StatusBadge, Badge, EVENT_TYPE, PARTICIPATION, fmtDate, Empty } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const request=useLive('/dashboard');
  const {data:d}=request;
  if(request.error||!d)return <RequestState {...request}/>;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={`Hoş geldin, ${user.name.split(' ')[0]}`} subtitle={`${user.title} · ${user.team}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Link to="/tasks?mine=true&status=open"><Stat label="Açık görevim" value={d.my_open} icon={ListChecks} /></Link>
        <Link to="/tasks?mine=true&overdue=true"><Stat label="Gecikmiş" value={d.my_overdue} icon={AlertTriangle} tone="red" /></Link>
        <Link to="/tasks?mine=true&priority=critical&status=open"><Stat label="Kritik" value={d.my_critical} icon={Flame} tone="amber" /></Link>
        <Link to="/tasks?mine=true&type=backup"><Stat label="Yedek sorumluluk" value={d.my_backup} icon={LifeBuoy} tone="violet" /></Link>
        <Stat label="Son 7 günde tamamlanan" value={d.my_done_week} icon={CheckCircle2} tone="emerald" />
      </div>

      {d.team && (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-300"><Users size={16} className="text-cyan-400" /><b>{user.role === 'director' ? 'Organizasyon' : 'Ekip'} durumu</b></div>
            <span>Toplam <b className="text-slate-50">{d.team.total}</b></span>
            <span>Açık <b className="text-sky-300">{d.team.open}</b></span>
            <span>Gecikmiş <b className="text-red-300">{d.team.overdue}</b></span>
            <span>Kritik açık <b className="text-orange-300">{d.team.critical_open}</b></span>
            <span>Tamamlanma <b className="text-emerald-300">%{d.team.completion_rate}</b></span>
            <Link to="/reports" className="ml-auto text-cyan-400 hover:underline">Rapora git →</Link>
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Bugün & gecikmiş işlerim" className="lg:col-span-2" action={<Link to="/tasks?mine=true" className="text-xs text-cyan-400">Tümü</Link>}>
          {d.today_tasks.length ? (
            <ul className="divide-y divide-slate-800">
              {d.today_tasks.map((t) => (
                <li key={t.id}>
                  <Link to={`/tasks?highlight=${t.id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-800/30">
                    <span className="font-mono text-xs text-slate-500">#{t.id}</span>
                    <span className="flex-1 truncate text-sm">{t.title}</span>
                    {t.backup_assignee_id === user.id && <Badge className="bg-violet-500/15 text-violet-300">Yedek</Badge>}
                    {t.overdue ? <Badge className="bg-red-500/15 text-red-300">Gecikmiş</Badge> : null}
                    <PriorityBadge p={t.priority} />
                    <StatusBadge s={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>Bugün için bekleyen iş yok 🎉</Empty>}
        </Card>

        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><CalendarDays size={15} />Yaklaşan etkinlikler</span>} action={<Link to="/events" className="text-xs text-cyan-400">Tümü</Link>}>
            <ul className="space-y-2.5">
              {d.upcoming_events.map((e) => (
                <li key={e.id}>
                  <Link to={`/events?highlight=${e.id}`} className="block rounded-lg p-1 hover:bg-slate-800/40">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="mt-0.5 flex gap-2 text-xs text-slate-500">
                      <span>{fmtDate(e.start_date)}</span><span>· {EVENT_TYPE[e.type]}</span><span>· {PARTICIPATION[e.participation]}</span>
                      {e.joined && <span className="text-emerald-400">· Katılıyorum</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={<span className="flex items-center gap-2"><Megaphone size={15} />Duyurular</span>}>
            <ul className="space-y-3">
              {d.announcements.map((a) => (
                <li key={a.id}>
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="line-clamp-2 text-xs text-slate-400">{a.body}</div>
                  <div className="text-[11px] text-slate-600">{a.author_name} · {fmtDate(a.created_at)}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
