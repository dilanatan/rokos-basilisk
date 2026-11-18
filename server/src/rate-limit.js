export function rateLimit(limit,windowMs=60000) {
  const entries=new Map();
  const cleanup=setInterval(()=>{for(const [key,v] of entries)if(v.until<=Date.now())entries.delete(key);},windowMs);
  cleanup.unref();
  return (req,res,next)=>{
    const key=req.user?.id??req.ip,now=Date.now();
    let entry=entries.get(key);
    if(!entry||entry.until<=now){entry={count:0,until:now+windowMs};entries.set(key,entry);}
    if(++entry.count>limit){res.set('Retry-After',String(Math.ceil((entry.until-now)/1000)));return res.status(429).json({error:'Çok sık işlem yapıldı. Bir dakika sonra tekrar deneyin.'});}
    next();
  };
}
