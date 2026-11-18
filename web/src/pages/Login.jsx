import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { useAuth, ROLE_LABEL } from '../auth.jsx';
import { Avatar, cx } from '../components/ui.jsx';

const ROLE_STYLE = {
  director: 'border-fuchsia-500/40 hover:bg-fuchsia-500/10',
  manager: 'border-amber-500/40 hover:bg-amber-500/10',
  employee: 'border-sky-500/30 hover:bg-sky-500/10',
};
const ROLE_DESC = {
  director: 'Tüm organizasyon: tüm görevler, raporlar, yetki yönetimi',
  manager: 'Kendi ekibi: görev atama, etkinlik, rapor, toplu bildirim',
  employee: 'Kendi görevleri, etkinlik katılımı, yetkinlik profili',
};

export default function Login() {
  const [users, setUsers] = useState([]);
  const { login } = useAuth();
  const nav = useNavigate();
  useEffect(() => { api('/auth/demo-users').then(setUsers); }, []);
  const groups = ['director', 'manager', 'employee'];
  return (
    <div className="grid-bg flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <ShieldCheck className="mx-auto mb-3 text-cyan-400" size={44} />
          <h1 className="text-3xl font-bold text-slate-50">CyberOps</h1>
          <p className="mt-1 text-slate-400">Siber güvenlik ekipleri için görev, etkinlik ve yetkinlik yönetimi</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 text-sm text-slate-400">Demo hesabı seçin (her rol farklı yetki seviyesini gösterir):</div>
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g}>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-200">{ROLE_LABEL[g]}</span>
                  <span className="text-xs text-slate-500">{ROLE_DESC[g]}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {users.filter((u) => u.role === g).map((u) => (
                    <button key={u.id} onClick={async () => { await login(u.id); nav('/'); }}
                      className={cx('flex items-center gap-3 rounded-xl border bg-slate-950/60 p-3 text-left transition', ROLE_STYLE[g])}>
                      <Avatar name={u.name} size={9} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{u.name}</div>
                        <div className="truncate text-xs text-slate-500">{u.title}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
