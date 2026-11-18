import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, MapPin, CalendarDays, Users, Building2, User } from 'lucide-react';
import { api } from '../api.js';
import { useAuth, useLive, isManager } from '../auth.jsx';
import { Card, Button, Select, Input, Textarea, Field, Modal, PageHeader, Badge, Avatar, EVENT_TYPE, PARTICIPATION, fmtDate, cx, Empty } from '../components/ui.jsx';

const TYPE_TONE = { conference: 'bg-cyan-500/15 text-cyan-300', training: 'bg-emerald-500/15 text-emerald-300', ctf: 'bg-red-500/15 text-red-300', webinar: 'bg-sky-500/15 text-sky-300', meetup: 'bg-amber-500/15 text-amber-300', exam: 'bg-violet-500/15 text-violet-300' };

export default function Events() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const scope = params.get('scope') || 'upcoming';
  const type = params.get('type') || '';
  const highlight = Number(params.get('highlight')) || null;
  const q = new URLSearchParams({ scope, ...(type ? { type } : {}) });
  const { data: events } = useLive(`/events?${q}`, ['events']);
  const [creating, setCreating] = useState(false);
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p); };

  useEffect(() => {
    if (highlight && events) setTimeout(() => document.getElementById(`event-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [highlight, events]);

  const toggle = async (e) => {
    try { await api(`/events/${e.id}/join`, { method: e.joined ? 'DELETE' : 'POST', body: {} }); } catch (err) { alert(err.message); }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Etkinlik & İletişim" subtitle="Bireysel ve kurumsal katılım sağlanan konferans, eğitim, CTF ve sınavlar">
        {isManager(user) && <Button onClick={() => setCreating(true)}><Plus size={16} /> Yeni etkinlik</Button>}
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        {[['upcoming', 'Yaklaşan'], ['past', 'Geçmiş'], ['all', 'Tümü']].map(([k, l]) => (
          <button key={k} onClick={() => set('scope', k)} className={cx('rounded-lg px-3 py-1.5 text-sm', scope === k ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-900')}>{l}</button>
        ))}
        <Select className="ml-auto w-40" value={type} onChange={(e) => set('type', e.target.value)} options={[['', 'Tüm türler'], ...Object.entries(EVENT_TYPE)]} />
      </div>
      {events && !events.length && <Empty>Etkinlik bulunamadı.</Empty>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events?.map((e) => (
          <Card key={e.id} className={cx('flex flex-col p-4', highlight === e.id && 'flash border-cyan-500')}>
            <div id={`event-${e.id}`} className="flex items-center gap-2">
              <Badge className={TYPE_TONE[e.type]}>{EVENT_TYPE[e.type]}</Badge>
              <Badge className={e.participation === 'corporate' ? 'bg-fuchsia-500/10 text-fuchsia-300' : 'bg-slate-800 text-slate-300'}>
                {e.participation === 'corporate' ? <Building2 size={11} /> : <User size={11} />}{PARTICIPATION[e.participation]}
              </Badge>
            </div>
            <h3 className="mt-2 font-semibold text-slate-50">{e.title}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-400">{e.description}</p>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5"><CalendarDays size={13} />{fmtDate(e.start_date)}{e.end_date && e.end_date !== e.start_date && ` – ${fmtDate(e.end_date)}`}</div>
              <div className="flex items-center gap-1.5"><MapPin size={13} />{e.location}</div>
              <div className="flex items-center gap-1.5"><Users size={13} />{e.participants.length} katılımcı</div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex -space-x-2">
                {e.participants.slice(0, 6).map((p) => <span key={p.user_id} title={`${p.name} (${p.role})`} className="ring-2 ring-slate-900 rounded-full"><Avatar name={p.name} size={7} /></span>)}
              </div>
              {scope !== 'past' && (
                <Button variant={e.joined ? 'outline' : 'primary'} onClick={() => toggle(e)}>{e.joined ? 'Katılımı iptal et' : 'Katıl'}</Button>
              )}
            </div>
            {e.participants.some((p) => p.role !== 'attendee') && (
              <div className="mt-2 text-[11px] text-slate-500">
                {e.participants.filter((p) => p.role !== 'attendee').map((p) => `${p.name} (${p.role === 'speaker' ? 'konuşmacı' : 'organizatör'})`).join(', ')}
              </div>
            )}
          </Card>
        ))}
      </div>
      <EventForm open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function EventForm({ open, onClose }) {
  const empty = { title: '', type: 'training', participation: 'corporate', start_date: '', end_date: '', location: '', description: '' };
  const [f, setF] = useState(empty);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="Yeni etkinlik">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api('/events', { method: 'POST', body: f }); setF(empty); onClose(); } catch (err) { alert(err.message); } }}>
        <Field label="Başlık"><Input required value={f.title} onChange={set('title')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tür"><Select value={f.type} onChange={set('type')} options={Object.entries(EVENT_TYPE)} /></Field>
          <Field label="Katılım"><Select value={f.participation} onChange={set('participation')} options={Object.entries(PARTICIPATION)} /></Field>
          <Field label="Başlangıç"><Input required type="date" value={f.start_date} onChange={set('start_date')} /></Field>
          <Field label="Bitiş"><Input type="date" value={f.end_date} onChange={set('end_date')} /></Field>
        </div>
        <Field label="Konum"><Input value={f.location} onChange={set('location')} /></Field>
        <Field label="Açıklama"><Textarea rows={3} value={f.description} onChange={set('description')} /></Field>
        <div className="text-xs text-slate-500">Kurumsal etkinliklerde tüm organizasyona, bireysel etkinliklerde ekibinize bildirim gönderilir.</div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>İptal</Button><Button>Oluştur</Button></div>
      </form>
    </Modal>
  );
}
