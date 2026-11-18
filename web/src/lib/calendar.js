export const dateKey = value => [value.getFullYear(),String(value.getMonth()+1).padStart(2,'0'),String(value.getDate()).padStart(2,'0')].join('-');
export const currentMonth=()=>dateKey(new Date()).slice(0,7);
export function validMonth(value){return typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)?value:currentMonth();}
export function monthDays(month) {
  const [year,number]=validMonth(month).split('-').map(Number);
  const first=new Date(year,number-1,1,12);
  first.setDate(first.getDate()-(first.getDay()+6)%7);
  return Array.from({length:42},(_,i)=>{const day=new Date(first);day.setDate(first.getDate()+i);return dateKey(day);});
}
export function shiftMonth(month,offset){const [year,number]=validMonth(month).split('-').map(Number);return dateKey(new Date(year,number-1+offset,1,12)).slice(0,7);}
export const eventsOnDay=(events,day)=>events.filter(event=>event.start_date<=day&&(event.end_date||event.start_date)>=day);
export const monthLabel=month=>new Date(validMonth(month)+'-01T12:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
