import { X } from 'lucide-react';

export const STATUS = {
  todo: { label: 'Yapılacak', cls: 'bg-slate-700/60 text-slate-200' },
  in_progress: { label: 'Devam ediyor', cls: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30' },
  review: { label: 'İncelemede', cls: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30' },
  done: { label: 'Tamamlandı', cls: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' },
};
export const PRIORITY = {
  low: { label: 'Düşük', cls: 'text-slate-400 bg-slate-500/10', dot: 'bg-slate-400' },
  medium: { label: 'Orta', cls: 'text-amber-300 bg-amber-500/10', dot: 'bg-amber-400' },
  high: { label: 'Yüksek', cls: 'text-orange-300 bg-orange-500/10', dot: 'bg-orange-500' },
  critical: { label: 'Kritik', cls: 'text-red-300 bg-red-500/15 ring-1 ring-red-500/40', dot: 'bg-red-500' },
};
export const TYPE = { daily: 'Günlük', backup: 'Yedek', project: 'Proje', incident: 'Olay' };
export const EVENT_TYPE = { conference: 'Konferans', training: 'Eğitim', ctf: 'CTF', webinar: 'Webinar', meetup: 'Meetup', exam: 'Sınav' };
export const PARTICIPATION = { individual: 'Bireysel', corporate: 'Kurumsal' };

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Badge({ className, children }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', className)}>{children}</span>;
}
export const StatusBadge = ({ s }) => <Badge className={STATUS[s]?.cls}>{STATUS[s]?.label}</Badge>;
export const PriorityBadge = ({ p }) => (
  <Badge className={PRIORITY[p]?.cls}><span className={cx('h-1.5 w-1.5 rounded-full', PRIORITY[p]?.dot)} />{PRIORITY[p]?.label}</Badge>
);

export function Card({ className, children, title, action }) {
  return (
    <div className={cx('rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {action}
        </div>
      )}
      <div className={title ? 'p-4' : ''}>{children}</div>
    </div>
  );
}

export function Button({ variant = 'primary', className, ...p }) {
  const v = {
    primary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold',
    ghost: 'bg-slate-800 text-slate-200 hover:bg-slate-700',
    danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
    outline: 'border border-slate-700 text-slate-200 hover:bg-slate-800',
  }[variant];
  return <button className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-50', v, className)} {...p} />;
}

export const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none';
/** className'de genişlik verilmişse varsayılan w-full'u kaldır (Tailwind sınıf çakışması). */
const withWidth = (extra) => cx(/(^|\s)w-/.test(extra || '') ? inputCls.replace('w-full ', '') : inputCls, extra);
export const Input = (p) => <input {...p} className={withWidth(p.className)} />;
export const Textarea = (p) => <textarea {...p} className={withWidth(p.className)} />;
export function Select({ options, className, ...p }) {
  return (
    <select {...p} className={cx(withWidth(className), 'py-1.5')}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
export function Field({ label, children }) {
  return <label className="block space-y-1"><span className="text-xs text-slate-400">{label}</span>{children}</label>;
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={cx('max-h-[90vh] w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, icon: Icon, tone = 'cyan', hint }) {
  const tones = { cyan: 'text-cyan-300 bg-cyan-500/10', red: 'text-red-300 bg-red-500/10', amber: 'text-amber-300 bg-amber-500/10', emerald: 'text-emerald-300 bg-emerald-500/10', violet: 'text-violet-300 bg-violet-500/10' };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {Icon && <div className={cx('rounded-lg p-2', tones[tone])}><Icon size={18} /></div>}
        <div>
          <div className="text-2xl font-bold tabular-nums text-slate-50">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-50">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export const Avatar = ({ name, size = 7 }) => {
  const initials = (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('');
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span title={name} className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-slate-950" style={{ width: size * 4, height: size * 4, background: `hsl(${hue} 70% 65%)` }}>
      {initials}
    </span>
  );
};

export const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d.replace(' ', 'T') + 'Z').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const Empty = ({ children }) => <div className="py-10 text-center text-sm text-slate-500">{children}</div>;
