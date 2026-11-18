import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {BookOpen,ArrowRight,Check,ChevronLeft,X} from 'lucide-react';
import {useAuth,isManager,homePath} from '../auth.jsx';
import {bus} from '../api.js';
export default function Tutorial() {
  const {user}=useAuth(),nav=useNavigate(),panel=useRef(null);
  const storageKey='cyberops_tour_v1_'+user.id;
  const [open,setOpen]=useState(()=>{try{return !localStorage.getItem(storageKey);}catch{return true;}});
  const [step,setStep]=useState(0);
  const manager=isManager(user);
  const steps=[
    {title:'CyberOps’a hoş geldin',body:'Bu kısa rehberle günlük işlerini, etkinliklerini ve ekip iletişimini nereden yöneteceğini öğren. Rehberi istediğin zaman üstteki “Siteyi öğren” düğmesinden tekrar açabilirsin.',path:homePath(user),tip:manager?'Yönetici ve direktörler ilk girişte raporları görür.':'İlk girişte kişisel panelin açılır.'},
    ...(manager?[{title:'Raporlarınla ekibin durumunu gör',body:'Açık, gecikmiş ve kritik işleri takip et. Direktör olarak ekip filtresi kullanabilir; görünen kapsamı CSV olarak indirebilir veya toplu bildirim gönderebilirsin.',path:'/reports',tip:'CSV çıktısı seçili ekip filtresine uyar.'}]:[{title:'Güne panelinden başla',body:'Sana ve yedek sorumlusu olduğun kişilere atanan işleri burada görürsün. Sayaçlara tıklayarak ilgili görev listesine geçebilirsin.',path:'/dashboard',tip:'Kırmızı tarih, görevin geciktiğini gösterir.'}]),
    {title:'Görevleri oluştur ve takip et',body:manager?'Yeni görev oluştur, sorumlu ve yedek kişi belirle. Liste veya Kanban görünümünden işlerin ilerleyişini takip et.':'Kendi görevini oluşturabilir, sana atanan görevlerin durumunu değiştirebilir ve yorum ekleyebilirsin.',path:'/tasks',tip:'Bir göreve tıklayınca ayrıntıları açılır. Tekrarlayan görev tamamlanınca sıradaki kayıt oluşur.'},
    {title:'Etkinlikleri takvimde planla',body:'Aylar arasında gezin, bir gün seç ve o günün etkinliklerini gör. Liste görünümüne geçebilir ve uygun etkinliklere katılabilirsin.',path:'/events?view=calendar',tip:manager?'Etkinlikleri düzenleyebilir, iptal edebilir ve katılım durumlarını güncelleyebilirsin.':'“Katıl” düğmesi seni etkinliğe kaydeder; kayıt, gerçekleşen katılımdan ayrıdır.'},
    {title:'Yetkinlik profilini güncel tut',body:'Becerilerini, seviyelerini ve sertifikalarını ekle. Sertifika bilgilerini düzeltebilir ve artık geçerli olmayan kayıtları silebilirsin.',path:'/competencies',tip:'Yaklaşan sertifika bitiş tarihlerini bu ekrandan takip et.'},
    {title:'Duyuruları ve bildirimleri takip et',body:'Ekip duyuruları burada; sana özel güncellemeler üstteki zil simgesinde. Okundu bilgisi ekranlar arasında güncellenir.',path:'/announcements',tip:'Yeni görev, yorum ve etkinlik güncellemeleri için bildirimleri kontrol et.'},
    {title:'Asistanla daha hızlı ilerle',body:'Sağ alttaki Asistan düğmesini veya Ctrl+K kısayolunu kullan. “Gecikmiş görevlerim” ya da “Yaklaşan etkinlikler” yazarak ilgili ekrana geçebilirsin.',path:homePath(user),tip:'Demo hesabı yalnızca rolünü ve yetkilerini değiştirir; her hesabın verisi ayrı yüklenir.'},
  ];
  useEffect(()=>{
    const start=()=>{setStep(0);setOpen(true);};
    bus.addEventListener('start-tour',start);
    return()=>bus.removeEventListener('start-tour',start);
  },[]);
  const close=()=>{try{localStorage.setItem(storageKey,'done');}catch{}setOpen(false);};
  useEffect(()=>{
    if(!open)return;
    panel.current?.focus();
    const key=e=>{if(e.key==='Escape')close();};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[open,step]);
  if(!open)return null;
  const current=steps[step];
  const go=next=>{setStep(next);nav(steps[next].path);};
  return <aside ref={panel} tabIndex={-1} role="dialog" aria-label="Siteyi öğren" className="fixed bottom-3 right-3 z-[70] w-[min(420px,calc(100vw-1.5rem))] rounded-2xl border border-cyan-500/50 bg-slate-900 p-5 shadow-2xl shadow-black/50 outline-none">
    <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300"><BookOpen size={16}/> Siteyi öğren · {step+1}/{steps.length}</div><button onClick={close} aria-label="Rehberi kapat" className="rounded p-1 text-slate-400 hover:text-white"><X size={18}/></button></div>
    <div className="mb-4 flex gap-1">{steps.map((_,i)=><span key={i} className={'h-1 flex-1 rounded '+(i<=step?'bg-cyan-400':'bg-slate-700')}/>)}</div>
    <h2 className="text-lg font-semibold text-white">{current.title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-slate-300">{current.body}</p>
    <p className="mt-3 rounded-lg bg-cyan-500/10 p-3 text-xs leading-relaxed text-cyan-200">{current.tip}</p>
    <div className="mt-4 flex items-center justify-between gap-2">
      {step>0?<button onClick={()=>go(step-1)} className="flex items-center gap-1 text-sm text-slate-300"><ChevronLeft size={16}/> Geri</button>:<button onClick={close} className="text-sm text-slate-400">Şimdilik atla</button>}
      <button onClick={()=>step===steps.length-1?close():go(step+1)} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">{step===steps.length-1?<>Tamamla <Check size={16}/></>:<>{step===0?'Başla':'Sonraki'} <ArrowRight size={16}/></>}</button>
    </div>
  </aside>;
}
