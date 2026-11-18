import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListChecks, CalendarDays, Award, BarChart3, Megaphone, Users, Plug, Bell, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, ROLE_LABEL, isManager } from './auth.jsx';
import { api, bus } from './api.js';
import { Avatar, cx, fmtDateTime } from './components/ui.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import Events from './pages/Events.jsx';
import Competencies from './pages/Competencies.jsx';
import Reports from './pages/Reports.jsx';
import Announcements from './pages/Announcements.jsx';
import Team from './pages/Team.jsx';
import Integrations from './pages/Integrations.jsx';
import Notifications from './pages/Notifications.jsx';

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Görevler', icon: ListChecks },
  { to: '/events', label: 'Etkinlikler', icon: CalendarDays },
  { to: '/competencies', label: 'Yetkinlikler', icon: Award },
  { to: '/announcements', label: 'Duyurular', icon: Megaphone },
  { to: '/reports', label: 'Raporlar', icon: BarChart3, manager: true },
  { to: '/team', label: 'Ekip & Yetki', icon: Users },
  { to: '/integrations', label: 'API & MCP', icon: Plug },
];

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="grid-bg flex-1 overflow-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/events" element={<Events />} />
            <Route path="/competencies" element={<Competencies />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/reports" element={isManager(user) ? <Reports /> : <Forbidden />} />
            <Route path="/team" element={<Team />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <ChatWidget />
      <Toasts />
    </div>
  );
}

function Forbidden() {
  return <div className="mt-20 text-center text-slate-400">Bu sayfa için <b>Yönetici</b> veya <b>Direktör</b> yetkisi gerekir.</div>;
}

function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <ShieldCheck className="text-cyan-400" />
        <div>
          <div className="font-bold tracking-wide text-slate-50">CyberOps</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">SecOps Task Hub</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.filter((n) => !n.manager || isManager(user)).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition', isActive ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}>
            <n.icon size={17} /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-slate-800 p-3 text-xs text-slate-500">
        <div className="mb-1 font-semibold text-slate-300">Yetki seviyesi</div>
        <span className={cx('rounded px-1.5 py-0.5 font-medium', user.role === 'director' ? 'bg-fuchsia-500/15 text-fuchsia-300' : user.role === 'manager' ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300')}>
          {ROLE_LABEL[user.role]}
        </span>
        <div className="mt-1">{user.team}</div>
      </div>
    </aside>
  );
}

function Topbar() {
  const { user, login, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => { api('/auth/demo-users').then(setUsers); }, []);
  const switchTo = async (id) => { setOpen(false); await login(id); nav('/'); };
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2 md:hidden"><ShieldCheck className="text-cyan-400" size={20} /><b>CyberOps</b></div>
      <div className="hidden text-xs text-slate-500 md:block">Demo modu · rol değiştirerek yetki seviyelerini deneyin →</div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-900">
            <Avatar name={user.name} />
            <div className="text-left leading-tight">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-[11px] text-slate-500">{user.title}</div>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>
          {open && (
            <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-slate-500">Kullanıcı değiştir (demo)</div>
              {users.map((u) => (
                <button key={u.id} onClick={() => switchTo(u.id)} className={cx('flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-slate-800', u.id === user.id && 'bg-slate-800')}>
                  <Avatar name={u.name} size={6} />
                  <span className="flex-1">{u.name}</span>
                  <span className="text-[11px] text-slate-500">{ROLE_LABEL[u.role]}</span>
                </button>
              ))}
              <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-800 px-3 py-2 text-sm text-red-300 hover:bg-slate-800"><LogOut size={14} /> Çıkış</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const load = () => api('/notifications').then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const fn = () => load();
    bus.addEventListener('notification', fn);
    return () => bus.removeEventListener('notification', fn);
  }, []);
  const unread = items.filter((n) => !n.is_read).length;
  const openItem = async (n) => {
    setOpen(false);
    await api('/notifications/read', { method: 'POST', body: { id: n.id } });
    load();
    if (n.link) nav(n.link);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-100">
        <Bell size={19} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="text-sm font-semibold">Bildirimler</span>
            <button className="text-xs text-cyan-400" onClick={async () => { await api('/notifications/read', { method: 'POST' }); load(); }}>Tümünü okundu yap</button>
          </div>
          <div className="max-h-96 overflow-auto">
            {items.slice(0, 12).map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={cx('block w-full border-b border-slate-800/60 px-3 py-2 text-left hover:bg-slate-800', !n.is_read && 'bg-cyan-500/5')}>
                <div className="flex items-center gap-1.5 text-sm font-medium">{!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}{n.title}</div>
                <div className="truncate text-xs text-slate-400">{n.body}</div>
                <div className="text-[10px] text-slate-600">{fmtDateTime(n.created_at)}</div>
              </button>
            ))}
            {!items.length && <div className="p-4 text-center text-sm text-slate-500">Bildirim yok</div>}
          </div>
          <button onClick={() => { setOpen(false); nav('/notifications'); }} className="w-full py-2 text-xs text-cyan-400 hover:bg-slate-800">Tümünü gör</button>
        </div>
      )}
    </div>
  );
}

/** Canlı bildirimler için sağ üst toast. */
function Toasts() {
  const [list, setList] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    const fn = (e) => {
      const n = e.detail;
      setList((l) => [...l, n]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== n.id)), 5000);
    };
    bus.addEventListener('notification', fn);
    return () => bus.removeEventListener('notification', fn);
  }, []);
  return (
    <div className="fixed right-4 top-16 z-50 space-y-2">
      {list.map((n) => (
        <button key={n.id} onClick={() => n.link && nav(n.link)} className="block w-80 rounded-xl border border-cyan-500/30 bg-slate-900/95 p-3 text-left shadow-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300"><Bell size={14} />{n.title}</div>
          <div className="mt-0.5 text-xs text-slate-300">{n.body}</div>
        </button>
      ))}
    </div>
  );
}
