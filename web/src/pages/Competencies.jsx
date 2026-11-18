import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, BadgeCheck, AlertTriangle, CalendarDays } from 'lucide-react';
import { api } from '../api.js';
import { useAuth, useLive, isManager } from '../auth.jsx';
import { Card, Button, Input, Field, Modal, PageHeader, Badge, Avatar, Select, fmtDate, cx } from '../components/ui.jsx';

const LEVEL_TONE = ['', 'bg-slate-600', 'bg-sky-600', 'bg-cyan-500', 'bg-emerald-500', 'bg-emerald-400'];

export default function Competencies() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { data } = useLive('/competencies', ['competencies', 'events']);
  const [modal, setModal] = useState(null); // 'skill' | 'cert'
  const [mode, setMode] = useState(isManager(user) ? 'matrix' : 'cards');
  const search = (params.get('search') || '').toLocaleLowerCase('tr');
  if (!data) return null;
  const people = search ? data.filter((p) => p.name.toLocaleLowerCase('tr').includes(search.split(' ')[0])) : data;
  const allSkills = [...new Set(data.flatMap((p) => p.skills.map((s) => s.name)))].sort();
  const expiring = data.flatMap((p) => p.certifications.filter((c) => c.expiring).map((c) => ({ ...c, person: p.name })));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Yetkinlikler" subtitle={isManager(user) ? 'Ekip yetkinlik matrisi, sertifikalar ve eğitim geçmişi' : 'Yetkinlik profiliniz, sertifikalarınız ve etkinlik geçmişiniz'}>
        {isManager(user) && (
          <div className="flex rounded-lg border border-slate-700 p-0.5 text-sm">
            <button onClick={() => setMode('matrix')} className={cx('rounded-md px-2.5 py-1', mode === 'matrix' && 'bg-slate-800 text-cyan-300')}>Matris</button>
            <button onClick={() => setMode('cards')} className={cx('rounded-md px-2.5 py-1', mode === 'cards' && 'bg-slate-800 text-cyan-300')}>Profiller</button>
          </div>
        )}
        <Button variant="ghost" onClick={() => setModal('cert')}><BadgeCheck size={16} /> Sertifika ekle</Button>
        <Button onClick={() => setModal('skill')}><Plus size={16} /> Yetkinlik ekle</Button>
      </PageHeader>

      {expiring.length > 0 && (
        <Card className="mb-4 border-amber-500/30 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-amber-300">
            <AlertTriangle size={16} /> Süresi 60 gün içinde dolacak sertifikalar:
            {expiring.map((c) => <Badge key={c.id} className="bg-amber-500/10 text-amber-200">{c.person}: {c.name} ({fmtDate(c.expires_at)})</Badge>)}
          </div>
        </Card>
      )}

      {mode === 'matrix' ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500">
                <th className="sticky left-0 bg-slate-900 px-4 py-2 text-left">Kişi</th>
                {allSkills.map((s) => <th key={s} className="px-1 py-2 font-medium"><div className="mx-auto w-20 text-[11px] leading-tight">{s}</div></th>)}
                <th className="px-3 text-left">Sertifikalar</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/60">
                  <td className="sticky left-0 bg-slate-900 px-4 py-2">
                    <div className="flex items-center gap-2"><Avatar name={p.name} size={6} /><div><div className="font-medium">{p.name}</div><div className="text-[11px] text-slate-500">{p.team}</div></div></div>
                  </td>
                  {allSkills.map((s) => {
                    const lvl = p.skills.find((x) => x.name === s)?.level;
                    return <td key={s} className="px-1 text-center">{lvl ? <span className={cx('inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-slate-950', LEVEL_TONE[lvl])}>{lvl}</span> : <span className="text-slate-700">·</span>}</td>;
                  })}
                  <td className="px-3 text-xs text-slate-400">{p.certifications.map((c) => c.name).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 px-4 py-2 text-[11px] text-slate-500">Seviye: {[1, 2, 3, 4, 5].map((l) => <span key={l} className="flex items-center gap-1"><span className={cx('h-3 w-3 rounded', LEVEL_TONE[l])} />{l}</span>)}</div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="mb-3 flex items-center gap-3"><Avatar name={p.name} size={10} /><div><div className="font-semibold">{p.name}</div><div className="text-xs text-slate-500">{p.title} · {p.team}</div></div></div>
              <div className="space-y-2">
                {p.skills.map((s) => (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs"><span>{s.name} <span className="text-slate-500">· {s.category}</span></span><span className="text-slate-400">{s.level}/5</span></div>
                    <div className="mt-1 h-1.5 rounded bg-slate-800"><div className="h-1.5 rounded bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${s.level * 20}%` }} /></div>
                  </div>
                ))}
              </div>
              {p.certifications.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.certifications.map((c) => <Badge key={c.id} className={c.expiring ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}><BadgeCheck size={11} />{c.name}</Badge>)}
                </div>
              )}
              {p.events.length > 0 && (
                <div className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-400">
                  <div className="mb-1 flex items-center gap-1 text-slate-500"><CalendarDays size={12} />Etkinlikler</div>
                  {p.events.map((e, i) => <div key={i}>• {e.title} <span className="text-slate-600">({e.role === 'speaker' ? 'konuşmacı' : e.status === 'attended' ? 'katıldı' : 'kayıtlı'})</span></div>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <SkillModal open={modal === 'skill'} people={data} onClose={() => setModal(null)} />
      <CertModal open={modal === 'cert'} people={data} onClose={() => setModal(null)} />
    </div>
  );
}

function PersonSelect({ people, value, onChange }) {
  const { user } = useAuth();
  if (!isManager(user)) return null;
  return <Field label="Kişi"><Select value={value} onChange={onChange} options={people.map((p) => [p.id, p.name])} /></Field>;
}

function SkillModal({ open, onClose, people }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: '', category: '', level: 3, user: user.id });
  return (
    <Modal open={open} onClose={onClose} title="Yetkinlik ekle / güncelle">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api('/competencies/skills', { method: 'POST', body: f }); onClose(); } catch (err) { alert(err.message); } }}>
        <PersonSelect people={people} value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })} />
        <Field label="Yetkinlik"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ör. Malware Analizi" /></Field>
        <Field label="Kategori"><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="ör. DFIR" /></Field>
        <Field label={`Seviye: ${f.level}/5`}><input type="range" min="1" max="5" value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })} className="w-full accent-cyan-500" /></Field>
        <div className="flex justify-end"><Button>Kaydet</Button></div>
      </form>
    </Modal>
  );
}

function CertModal({ open, onClose, people }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: '', issuer: '', expires_at: '', user: user.id });
  return (
    <Modal open={open} onClose={onClose} title="Sertifika ekle">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api('/competencies/certifications', { method: 'POST', body: f }); onClose(); } catch (err) { alert(err.message); } }}>
        <PersonSelect people={people} value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })} />
        <Field label="Sertifika"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ör. OSCP" /></Field>
        <Field label="Veren kurum"><Input value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} /></Field>
        <Field label="Geçerlilik bitişi"><Input type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></Field>
        <div className="flex justify-end"><Button>Kaydet</Button></div>
      </form>
    </Modal>
  );
}
