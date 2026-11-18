import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Plus,MapPin,CalendarDays,Users,ChevronLeft,ChevronRight,List,Edit3,Ban} from 'lucide-react';
import {api} from '../api.js';
import {useAuth,useLive,isManager} from '../auth.jsx';
import {Card,Button,Select,Input,Textarea,Field,Modal,PageHeader,Badge,Avatar,EVENT_TYPE,PARTICIPATION,fmtDate,cx,Empty} from '../components/ui.jsx';
import {RequestState} from '../components/RequestState.jsx';
import {dateKey,currentMonth,validMonth,monthDays,shiftMonth,eventsOnDay,monthLabel} from '../lib/calendar.js';

export default function Events() {
  const {user}=useAuth(),[params,setParams]=useSearchParams();
  const view=params.get('view')||'calendar',scope=params.get('scope')||'upcoming',type=params.get('type')||'',participation=params.get('participation')||'';
  const month=validMonth(params.get('month')||currentMonth());
  const selected=params.get('date')?.startsWith(month)?params.get('date'):dateKey(new Date()).startsWith(month)?dateKey(new Date()):month+'-01';
  const q=new URLSearchParams({scope:view==='calendar'?'all':scope,...(type?{type}:{}),...(participation?{participation}:{})});
  const request=useLive('/events?'+q,['events']),events=request.data||[];
  const {data:users}=useLive(isManager(user)?'/users':null,['users']);
  const assignable=(users||[]).filter(u=>u.visible);
  const [editor,setEditor]=useState(null),[error,setError]=useState('');
  const set=(values)=>{const next=new URLSearchParams(params);for(const[k,v]of Object.entries(values))v?next.set(k,v):next.delete(k);setParams(next);};
  const highlight=Number(params.get('highlight'));
  useEffect(()=>{
    if(!highlight||!request.data)return;
    const event=events.find(e=>e.id===highlight);
    if(event&&view==='calendar'&&(!params.get('date')||params.get('date')<event.start_date||params.get('date')>(event.end_date||event.start_date)))set({month:event.start_date.slice(0,7),date:event.start_date});
  },[highlight,request.data]);
  const act=async fn=>{setError('');try{await fn();request.reload();}catch(e){setError(e.message);}};
  const toggle=event=>act(()=>api('/events/'+event.id+'/join',{method:event.joined?'DELETE':'POST',body:{}}));
  const cancel=event=>{if(confirm('"'+event.title+'" etkinliği iptal edilsin mi?'))return act(()=>api('/events/'+event.id,{method:'PATCH',body:{status:'cancelled'}}));};
  const visible=view==='calendar'?eventsOnDay(events,selected):events;
  return <div className="mx-auto max-w-7xl">
    <PageHeader title="Etkinlikler" subtitle="Takvimini planla, etkinliklere katıl ve katılımını takip et">
      <div className="flex rounded-lg border border-slate-700 p-1"><button aria-pressed={view==='calendar'} onClick={()=>set({view:'calendar'})} className={cx('flex items-center gap-1 rounded px-3 py-1 text-sm',view==='calendar'&&'bg-cyan-500/15 text-cyan-300')}><CalendarDays size={15}/> Takvim</button><button aria-pressed={view==='list'} onClick={()=>set({view:'list'})} className={cx('flex items-center gap-1 rounded px-3 py-1 text-sm',view==='list'&&'bg-cyan-500/15 text-cyan-300')}><List size={15}/> Liste</button></div>
      {isManager(user)&&<Button onClick={()=>setEditor({start_date:selected,end_date:selected})}><Plus size={16}/> Yeni etkinlik</Button>}
    </PageHeader>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {view==='list'&&<Select aria-label="Etkinlik dönemi" className="w-40" value={scope} onChange={e=>set({scope:e.target.value})} options={[['upcoming','Yaklaşan'],['past','Geçmiş'],['all','Tümü']]}/>}
      <Select aria-label="Etkinlik türü" className="w-40" value={type} onChange={e=>set({type:e.target.value})} options={[['','Tüm türler'],...Object.entries(EVENT_TYPE)]}/>
      <Select aria-label="Katılım türü" className="w-40" value={participation} onChange={e=>set({participation:e.target.value})} options={[['','Tüm katılımlar'],...Object.entries(PARTICIPATION)]}/>
    </div>
    <RequestState {...request}/>{error&&<RequestState error={error} reload={()=>setError('')}/>}
    {view==='calendar'&&<section aria-label="Etkinlik takvimi" className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 p-3"><h2 className="font-semibold capitalize">{monthLabel(month)}</h2><div className="flex items-center gap-1"><button aria-label="Önceki ay" onClick={()=>set({month:shiftMonth(month,-1),date:'',highlight:''})} className="rounded p-2 hover:bg-slate-800"><ChevronLeft size={18}/></button><button onClick={()=>set({month:currentMonth(),date:dateKey(new Date()),highlight:''})} className="rounded px-2 py-1 text-sm text-cyan-300">Bugün</button><button aria-label="Sonraki ay" onClick={()=>set({month:shiftMonth(month,1),date:'',highlight:''})} className="rounded p-2 hover:bg-slate-800"><ChevronRight size={18}/></button></div></div>
      <div className="grid grid-cols-7">{['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(day=><div key={day} className="border-b border-slate-800 py-2 text-center text-xs text-slate-500">{day}</div>)}</div>
      <div className="grid grid-cols-7">{monthDays(month).map(day=>{
        const daily=eventsOnDay(events,day),today=day===dateKey(new Date());
        return <div key={day} className={cx('min-h-20 min-w-0 border-b border-r border-slate-800/70 p-1 sm:min-h-28 sm:p-2',!day.startsWith(month)&&'bg-slate-950/60 text-slate-600',day===selected&&'bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/60')}>
          <button aria-label={fmtDate(day)+', '+daily.length+' etkinlik'} aria-pressed={selected===day} onClick={()=>set({date:day,month:day.slice(0,7),highlight:''})} className="flex w-full items-center justify-between text-xs"><span className={cx('flex h-6 w-6 items-center justify-center rounded-full',today&&'bg-cyan-400 font-bold text-slate-950')}>{Number(day.slice(-2))}</span>{daily.length>0&&<span className="text-[10px] text-cyan-400">{daily.length}</span>}</button>
          <div className="mt-1 space-y-1">{daily.slice(0,2).map(event=><button key={event.id} title={event.title} onClick={()=>set({date:day,month:day.slice(0,7),highlight:String(event.id)})} className={cx('block w-full truncate rounded px-1 py-1 text-left text-[10px] sm:text-xs',event.status==='cancelled'?'bg-slate-800 text-slate-500 line-through':event.participation==='corporate'?'bg-violet-500/15 text-violet-200':'bg-cyan-500/15 text-cyan-200')}>{event.title}</button>)}{daily.length>2&&<button onClick={()=>set({date:day,month:day.slice(0,7),highlight:''})} className="text-[10px] text-slate-400">+{daily.length-2} etkinlik</button>}</div>
        </div>;
      })}</div>
    </section>}
    <h2 className="mb-3 text-sm font-semibold text-slate-300">{view==='calendar'?fmtDate(selected)+' · '+visible.length+' etkinlik':'Etkinlik listesi'}</h2>
    {!request.loading&&!visible.length&&<Empty>Bu seçimde etkinlik bulunmuyor.</Empty>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(event=><Card key={event.id} className={cx('flex flex-col p-4',event.id===highlight&&'ring-1 ring-cyan-400')}>
      <div className="mb-2 flex flex-wrap gap-1"><Badge className="bg-cyan-500/10 text-cyan-300">{EVENT_TYPE[event.type]}</Badge><Badge className="bg-slate-800 text-slate-300">{PARTICIPATION[event.participation]}</Badge>{event.status==='cancelled'&&<Badge className="bg-red-500/15 text-red-300">İptal edildi</Badge>}</div>
      <h3 className="font-semibold">{event.title}</h3><p className="mt-1 flex-1 text-sm text-slate-400">{event.description}</p>
      <div className="mt-3 space-y-1 text-xs text-slate-400"><p className="flex gap-2"><CalendarDays size={14}/>{fmtDate(event.start_date)}{event.end_date!==event.start_date&&' — '+fmtDate(event.end_date)}</p><p className="flex gap-2"><MapPin size={14}/>{event.location||'Konum belirtilmedi'}</p><p className="flex gap-2"><Users size={14}/>{event.participants.length} katılımcı</p></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {event.status!=='cancelled'&&(event.end_date||event.start_date)>=dateKey(new Date())&&<Button variant={event.joined?'outline':'primary'} onClick={()=>toggle(event)}>{event.joined?'Katılımı iptal et':'Katıl'}</Button>}
        {event.can_manage&&<><Button variant="ghost" onClick={()=>setEditor(event)}><Edit3 size={14}/> Düzenle</Button>{event.status!=='cancelled'&&<Button variant="danger" onClick={()=>cancel(event)}><Ban size={14}/> İptal</Button>}</>}
      </div>
      {event.participants.length>0&&<details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer">Katılımcılar ve durumları</summary><div className="mt-2 space-y-2">{event.participants.map(p=><div key={p.user_id} className="flex items-center gap-2"><Avatar name={p.name} size={6}/><span className="flex-1">{p.name}<span className="block text-[10px]">{p.role==='speaker'?'Konuşmacı':p.role==='organizer'?'Organizatör':'Katılımcı'}</span></span>{event.can_manage&&assignable.some(u=>u.id===p.user_id)?<Select aria-label={p.name+' katılım durumu'} className="w-28" value={p.status} onChange={e=>act(()=>api('/events/'+event.id+'/participants/'+p.user_id,{method:'PATCH',body:{status:e.target.value}}))} options={[['registered','Kayıtlı'],['attended','Katıldı']]}/>:<span>{p.status==='attended'?'Katıldı':'Kayıtlı'}</span>}</div>)}</div></details>}
      {event.can_manage&&event.status!=='cancelled'&&(event.end_date||event.start_date)>=dateKey(new Date())&&<ParticipantForm event={event} users={assignable} onSave={act}/>}
    </Card>)}</div>
    {editor&&<EventForm initial={editor} onClose={()=>setEditor(null)} onSaved={request.reload}/>}
  </div>;
}
function ParticipantForm({event,users,onSave}) {
  const [person,setPerson]=useState(''),[role,setRole]=useState('attendee');
  return <form className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3" onSubmit={e=>{e.preventDefault();if(person)onSave(()=>api('/events/'+event.id+'/join',{method:'POST',body:{user:person,role}}));}}>
    <Select aria-label="Ekip üyesi" className="w-36" required value={person} onChange={e=>setPerson(e.target.value)} options={[['','Kişi seç'],...users.map(u=>[u.id,u.name])]}/>
    <Select aria-label="Katılım rolü" className="w-28" value={role} onChange={e=>setRole(e.target.value)} options={[['attendee','Katılımcı'],['speaker','Konuşmacı'],['organizer','Organizatör']]}/><Button>Kaydet</Button>
  </form>;
}
function EventForm({initial,onClose,onSaved}) {
  const [f,setF]=useState({title:initial.title||'',type:initial.type||'training',participation:initial.participation||'corporate',start_date:initial.start_date,end_date:initial.end_date||initial.start_date,location:initial.location||'',description:initial.description||''});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const set=key=>e=>setF({...f,[key]:e.target.value});
  return <Modal open onClose={onClose} title={initial.id?'Etkinliği düzenle':'Yeni etkinlik'}><form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/events'+(initial.id?'/'+initial.id:''),{method:initial.id?'PATCH':'POST',body:f});onSaved();onClose();}catch(err){setError(err.message);}finally{setBusy(false);}}}>
    <Field label="Başlık"><Input required maxLength={200} value={f.title} onChange={set('title')}/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Tür"><Select value={f.type} onChange={set('type')} options={Object.entries(EVENT_TYPE)}/></Field><Field label="Katılım"><Select value={f.participation} onChange={set('participation')} options={Object.entries(PARTICIPATION)}/></Field><Field label="Başlangıç"><Input required type="date" value={f.start_date} onChange={set('start_date')}/></Field><Field label="Bitiş"><Input required type="date" min={f.start_date} value={f.end_date} onChange={set('end_date')}/></Field></div>
    <Field label="Konum"><Input maxLength={500} value={f.location} onChange={set('location')}/></Field><Field label="Açıklama"><Textarea maxLength={10000} rows={3} value={f.description} onChange={set('description')}/></Field>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Vazgeç</Button><Button disabled={busy}>{busy?'Kaydediliyor…':'Kaydet'}</Button></div>
  </form></Modal>;
}
