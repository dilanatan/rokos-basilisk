import {RequestState} from '../components/RequestState.jsx';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../api.js';
import { useLive } from '../auth.jsx';
import { Card, Button, PageHeader, fmtDateTime, cx, Empty } from '../components/ui.jsx';

export default function Notifications() {
  const request=useLive('/notifications',['notifications','tasks','events','announcements']);
  const {data,reload}=request;
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Bildirimler" subtitle="Görev atama, durum değişikliği, gecikme, etkinlik ve duyuru bildirimleri (canlı)">
        <Button variant="ghost" onClick={async () => { await api('/notifications/read', { method: 'POST' }); reload(); }}>Tümünü okundu yap</Button>
      </PageHeader>
      <RequestState {...request}/>
      <Card>
        {data?.length ? data.map((n) => (
          <button key={n.id} onClick={async () => { await api('/notifications/read', { method: 'POST', body: { id: n.id } }); reload(); if (n.link) nav(n.link); }}
            className={cx('flex w-full items-start gap-3 border-b border-slate-800 px-4 py-3 text-left hover:bg-slate-800/40', !n.is_read && 'bg-cyan-500/5')}>
            <Bell size={16} className={n.is_read ? 'mt-0.5 text-slate-600' : 'mt-0.5 text-cyan-400'} />
            <div className="flex-1"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-slate-400">{n.body}</div></div>
            <div className="text-[11px] text-slate-600">{fmtDateTime(n.created_at)}</div>
          </button>
        )) : <Empty>Bildirim yok</Empty>}
      </Card>
    </div>
  );
}
