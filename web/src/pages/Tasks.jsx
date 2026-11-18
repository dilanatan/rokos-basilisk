import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LayoutList, Columns3, X, Trash2, MessageSquare, Repeat, LifeBuoy, Filter } from 'lucide-react';
import { api } from '../api.js';
import { useAuth, useLive, isManager } from '../auth.jsx';
import {
  Card, Button, Select, Input, Textarea, Field, Modal, PageHeader, PriorityBadge, StatusBadge, Badge, Avatar,
  STATUS, PRIORITY, TYPE, fmtDate, fmtDateTime, cx, Empty,
} from '../components/ui.jsx';

const FILTER_KEYS = ['status', 'priority', 'type', 'assignee', 'overdue', 'mine', 'search'];

export default function Tasks() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'list';
  const highlight = Number(params.get('highlight')) || null;
  const query = useMemo(() => {
    const q = new URLSearchParams();
    FILTER_KEYS.forEach((k) => params.get(k) && q.set(k, params.get(k)));
    return q.toString();
  }, [params]);
  const { data: tasks } = useLive(`/tasks${query ? `?${query}` : ''}`, ['tasks']);
  const { data: users } = useLive('/users', ['users']);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    p.delete('highlight');
    setParams(p);
  };

  // Chatbot / bildirimden gelen highlight → kaydı aç + kaydır
  useEffect(() => {
    if (!highlight) return;
    setSelected(highlight);
    setTimeout(() => document.getElementById(`task-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  }, [highlight]);

  const activeFilters = FILTER_KEYS.filter((k) => params.get(k));
  const assignable = (users || []).filter((u) => u.visible);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Görevler" subtitle="Günlük işler, yedek sorumluluklar, projeler ve olaylar">
        <div className="flex rounded-lg border border-slate-700 p-0.5">
          <button onClick={() => setParam('view', 'list')} className={cx('rounded-md px-2 py-1', view === 'list' && 'bg-slate-800 text-cyan-300')}><LayoutList size={16} /></button>
          <button onClick={() => setParam('view', 'board')} className={cx('rounded-md px-2 py-1', view === 'board' && 'bg-slate-800 text-cyan-300')}><Columns3 size={16} /></button>
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> Yeni görev</Button>
      </PageHeader>

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={15} className="text-slate-500" />
          <Input placeholder="Ara…" className="w-44" defaultValue={params.get('search') || ''} onKeyDown={(e) => e.key === 'Enter' && setParam('search', e.target.value)} />
          <Select className="w-40" value={params.get('status') || ''} onChange={(e) => setParam('status', e.target.value)}
            options={[['', 'Tüm durumlar'], ['open', 'Açık (tamamlanmamış)'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])]} />
          <Select className="w-36" value={params.get('priority') || ''} onChange={(e) => setParam('priority', e.target.value)}
            options={[['', 'Tüm öncelikler'], ...Object.entries(PRIORITY).map(([k, v]) => [k, v.label])]} />
          <Select className="w-32" value={params.get('type') || ''} onChange={(e) => setParam('type', e.target.value)}
            options={[['', 'Tüm türler'], ...Object.entries(TYPE)]} />
          {isManager(user) && (
            <Select className="w-44" value={params.get('assignee') || ''} onChange={(e) => setParam('assignee', e.target.value)}
              options={[['', 'Tüm kişiler'], ...assignable.map((u) => [u.name, u.name])]} />
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-300"><input type="checkbox" checked={params.get('mine') === 'true'} onChange={(e) => setParam('mine', e.target.checked ? 'true' : '')} /> Bana atananlar</label>
          <label className="flex items-center gap-1.5 text-sm text-slate-300"><input type="checkbox" checked={params.get('overdue') === 'true'} onChange={(e) => setParam('overdue', e.target.checked ? 'true' : '')} /> Gecikmiş</label>
          {activeFilters.length > 0 && <Button variant="ghost" onClick={() => setParams(view !== 'list' ? { view } : {})}><X size={14} /> Temizle</Button>}
          <span className="ml-auto text-xs text-slate-500">{tasks?.length ?? 0} görev</span>
        </div>
      </Card>

      {!tasks ? null : view === 'board' ? (
        <Board tasks={tasks} onOpen={setSelected} highlight={highlight} />
      ) : (
        <Card>
          {tasks.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-2.5">#</th><th className="px-2">Görev</th><th className="px-2">Tür</th><th className="px-2">Öncelik</th>
                    <th className="px-2">Durum</th><th className="px-2">Sorumlu / Yedek</th><th className="px-2">Bitiş</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} id={`task-${t.id}`} onClick={() => setSelected(t.id)}
                      className={cx('cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/40', highlight === t.id && 'flash bg-cyan-500/10', t.status === 'done' && 'opacity-60')}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{t.id}</td>
                      <td className="px-2">
                        <div className="flex items-center gap-1.5 font-medium text-slate-100">{t.title}{t.recurrence !== 'none' && <Repeat size={12} className="text-slate-500" />}</div>
                        <div className="text-xs text-slate-500">{t.category}</div>
                      </td>
                      <td className="px-2"><Badge className={t.type === 'incident' ? 'bg-red-500/10 text-red-300' : t.type === 'backup' ? 'bg-violet-500/15 text-violet-300' : 'bg-slate-800 text-slate-300'}>{TYPE[t.type]}</Badge></td>
                      <td className="px-2"><PriorityBadge p={t.priority} /></td>
                      <td className="px-2"><StatusBadge s={t.status} /></td>
                      <td className="px-2">
                        <div className="flex items-center gap-1.5"><Avatar name={t.assignee_name} size={6} /><span className="text-slate-300">{t.assignee_name}</span></div>
                        {t.backup_name && <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><LifeBuoy size={11} />{t.backup_name}</div>}
                      </td>
                      <td className={cx('px-2 whitespace-nowrap', t.overdue ? 'font-semibold text-red-400' : 'text-slate-400')}>{fmtDate(t.due_date)}{t.overdue ? ' ⚠' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>Filtrelere uyan görev yok.</Empty>}
        </Card>
      )}

      {selected && <TaskDrawer id={selected} users={assignable} onClose={() => { setSelected(null); if (highlight) setParam('highlight', ''); }} />}
      <TaskForm open={creating} users={assignable} onClose={() => setCreating(false)} />
    </div>
  );
}

function Board({ tasks, onOpen, highlight }) {
  const move = (t, status) => api(`/tasks/${t.id}`, { method: 'PATCH', body: { status } }).catch((e) => alert(e.message));
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Object.entries(STATUS).map(([s, meta]) => {
        const col = tasks.filter((t) => t.status === s);
        return (
          <div key={s} className="rounded-xl border border-slate-800 bg-slate-900/40 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const t = tasks.find((x) => x.id === Number(e.dataTransfer.getData('id'))); if (t && t.status !== s) move(t, s); }}>
            <div className="mb-2 flex items-center justify-between px-2 pt-1"><StatusBadge s={s} /><span className="text-xs text-slate-500">{col.length}</span></div>
            <div className="space-y-2">
              {col.map((t) => (
                <div key={t.id} id={`task-${t.id}`} draggable onDragStart={(e) => e.dataTransfer.setData('id', t.id)} onClick={() => onOpen(t.id)}
                  className={cx('cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-3 hover:border-slate-600', highlight === t.id && 'flash border-cyan-500')}>
                  <div className="mb-1.5 flex items-center justify-between"><span className="font-mono text-[11px] text-slate-500">#{t.id} · {TYPE[t.type]}</span><PriorityBadge p={t.priority} /></div>
                  <div className="text-sm font-medium text-slate-100">{t.title}</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Avatar name={t.assignee_name} size={5} />{t.assignee_name?.split(' ')[0]}</span>
                    <span className={t.overdue ? 'text-red-400' : ''}>{fmtDate(t.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskDrawer({ id, users, onClose }) {
  const { user } = useAuth();
  const { data: t, error } = useLive(`/tasks/${id}`, ['tasks']);
  const [comment, setComment] = useState('');
  const patch = (body) => api(`/tasks/${id}`, { method: 'PATCH', body }).catch((e) => alert(e.message));
  const mgr = isManager(user);
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-auto border-l border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs text-slate-500">#{id} {t && `· ${TYPE[t.type]} · ${t.category}`}</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-50">{t?.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        {t && (
          <div className="space-y-5">
            <p className="text-sm text-slate-300">{t.description || <i className="text-slate-500">Açıklama yok</i>}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durum">
                <Select value={t.status} onChange={(e) => patch({ status: e.target.value })} options={Object.entries(STATUS).map(([k, v]) => [k, v.label])} />
              </Field>
              <Field label="Öncelik">
                <Select disabled={!mgr} value={t.priority} onChange={(e) => patch({ priority: e.target.value })} options={Object.entries(PRIORITY).map(([k, v]) => [k, v.label])} />
              </Field>
              <Field label="Sorumlu">
                <Select disabled={!mgr} value={t.assignee_id || ''} onChange={(e) => patch({ assignee: e.target.value })} options={users.map((u) => [u.id, u.name])} />
              </Field>
              <Field label="Yedek sorumlu">
                <Select disabled={!mgr} value={t.backup_assignee_id || ''} onChange={(e) => patch({ backup_assignee: e.target.value })} options={[['', '— Yok —'], ...users.map((u) => [u.id, u.name])]} />
              </Field>
              <Field label="Bitiş tarihi">
                <Input type="date" disabled={!mgr} value={t.due_date || ''} onChange={(e) => patch({ due_date: e.target.value })} />
              </Field>
              <Field label="Tekrar">
                <Input disabled value={{ none: 'Yok', daily: 'Her gün', weekly: 'Her hafta' }[t.recurrence]} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Oluşturan: {t.creator_name}</span><span>·</span><span>{fmtDateTime(t.created_at)}</span>
              {t.completed_at && <><span>·</span><span className="text-emerald-400">Tamamlandı {fmtDateTime(t.completed_at)}</span></>}
            </div>
            {!mgr && <div className="rounded-lg border border-slate-800 p-2 text-xs text-slate-500">Çalışan yetkisiyle sadece durum güncelleyebilir ve yorum ekleyebilirsiniz.</div>}

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MessageSquare size={15} />Yorumlar ({t.comments.length})</h3>
              <div className="space-y-2">
                {t.comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.user_name} size={6} />
                    <div className="flex-1 rounded-lg bg-slate-800/60 p-2">
                      <div className="text-xs text-slate-400"><b className="text-slate-200">{c.user_name}</b> · {fmtDateTime(c.created_at)}</div>
                      <div className="text-sm">{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form className="mt-2 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!comment.trim()) return; await api(`/tasks/${id}/comments`, { method: 'POST', body: { body: comment } }); setComment(''); }}>
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorum ekle…" />
                <Button>Gönder</Button>
              </form>
            </div>
            {mgr && (
              <Button variant="danger" onClick={async () => { if (confirm('Görev silinsin mi?')) { await api(`/tasks/${id}`, { method: 'DELETE' }); onClose(); } }}>
                <Trash2 size={14} /> Görevi sil
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskForm({ open, onClose, users }) {
  const { user } = useAuth();
  const empty = { title: '', description: '', type: 'daily', category: user.team === 'Ofansif Güvenlik' ? 'Sızma Testi' : 'SOC', priority: 'medium', assignee: user.id, backup_assignee: '', due_date: new Date().toISOString().slice(0, 10), recurrence: 'none' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/tasks', { method: 'POST', body: { ...f, backup_assignee: f.backup_assignee || undefined } });
      setF(empty); setErr(''); onClose();
    } catch (e2) { setErr(e2.message); }
  };
  const options = isManager(user) ? users : users.filter((u) => u.id === user.id);
  return (
    <Modal open={open} onClose={onClose} title="Yeni görev">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Başlık"><Input required value={f.title} onChange={set('title')} placeholder="ör. SIEM korelasyon kuralı güncelleme" /></Field>
        <Field label="Açıklama"><Textarea rows={3} value={f.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tür"><Select value={f.type} onChange={set('type')} options={Object.entries(TYPE)} /></Field>
          <Field label="Öncelik"><Select value={f.priority} onChange={set('priority')} options={Object.entries(PRIORITY).map(([k, v]) => [k, v.label])} /></Field>
          <Field label="Sorumlu"><Select value={f.assignee} onChange={set('assignee')} options={options.map((u) => [u.id, u.name])} /></Field>
          <Field label="Yedek sorumlu"><Select value={f.backup_assignee} onChange={set('backup_assignee')} options={[['', '— Yok —'], ...options.map((u) => [u.id, u.name])]} /></Field>
          <Field label="Kategori"><Input value={f.category} onChange={set('category')} /></Field>
          <Field label="Bitiş"><Input type="date" value={f.due_date} onChange={set('due_date')} /></Field>
          <Field label="Tekrar"><Select value={f.recurrence} onChange={set('recurrence')} options={[['none', 'Yok'], ['daily', 'Her gün'], ['weekly', 'Her hafta']]} /></Field>
        </div>
        {err && <div className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">{err}</div>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>İptal</Button><Button>Oluştur</Button></div>
      </form>
    </Modal>
  );
}
