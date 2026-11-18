import {RequestState} from '../components/RequestState.jsx';
import { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { api } from '../api.js';
import { useAuth, useLive, isManager } from '../auth.jsx';
import { Card, Button, Input, Textarea, Field, Modal, PageHeader, Badge, Avatar, Select, fmtDateTime, Empty } from '../components/ui.jsx';

export default function Announcements() {
  const { user } = useAuth();
  const request=useLive('/announcements',['announcements']);
  const {data}=request;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', body: '', audience: 'all' });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Duyurular" subtitle="Kurumsal ve ekip içi iletişim">
        {isManager(user) && <Button onClick={() => setOpen(true)}><Plus size={16} /> Duyuru yayınla</Button>}
      </PageHeader>
      <RequestState {...request}/>
      {data && !data.length && <Empty>Duyuru yok.</Empty>}
      <div className="space-y-3">
        {data?.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-300"><Megaphone size={18} /></div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-50">{a.title}</h3>
                  <Badge className="bg-slate-800 text-slate-300">{a.audience === 'all' ? 'Tüm organizasyon' : `${a.audience} ekibi`}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-300">{a.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Avatar name={a.author_name} size={5} />{a.author_name} · {a.author_title} · {fmtDateTime(a.created_at)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Duyuru yayınla">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api('/announcements', { method: 'POST', body: f }); setF({ title: '', body: '', audience: 'all' }); setOpen(false); } catch (err) { alert(err.message); } }}>
          <Field label="Başlık"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="İçerik"><Textarea required rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          {user.role === 'director'
            ? <Field label="Hedef kitle"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} options={[['all', 'Tüm organizasyon'], ['SOC', 'SOC'], ['Ofansif Güvenlik', 'Ofansif Güvenlik']]} /></Field>
            : <div className="text-xs text-slate-500">Duyuru {user.team} ekibinize gönderilecek.</div>}
          <div className="flex justify-end"><Button>Yayınla & bildir</Button></div>
        </form>
      </Modal>
    </div>
  );
}
