const KEY='cyberops_token';
let memoryToken=null;
const pending=new Set(),writes=new Map();
export const bus=new EventTarget();
export const getToken=()=>{try{return localStorage.getItem(KEY);}catch{return memoryToken;}};
export const setToken=token=>{
  for(const controller of pending)controller.abort();
  pending.clear();writes.clear();memoryToken=token;
  try{token?localStorage.setItem(KEY,token):localStorage.removeItem(KEY);}catch{}
};
async function request(path,{method='GET',body,signal}={}) {
  const controller=new AbortController(),token=getToken();
  pending.add(controller);
  const timeout=setTimeout(()=>controller.abort(new DOMException('İstek zaman aşımına uğradı','TimeoutError')),70000);
  try {
    const response=await fetch('/api'+path,{
      method,signal:signal?AbortSignal.any([signal,controller.signal]):controller.signal,
      headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      body:body===undefined?undefined:JSON.stringify(body),
    });
    if(response.status===401&&!path.startsWith('/auth')&&token===getToken())bus.dispatchEvent(new Event('auth-lost'));
    const data=response.headers.get('content-type')?.includes('json')?await response.json():await response.text();
    if(!response.ok)throw new Error(data?.error||'İstek başarısız (HTTP '+response.status+')');
    return data;
  } finally {clearTimeout(timeout);pending.delete(controller);}
}
export function api(path,options={}) {
  if(!options.method||options.method==='GET')return request(path,options);
  const key=getToken()+'|'+options.method+'|'+path+'|'+JSON.stringify(options.body);
  if(writes.has(key))return writes.get(key);
  const promise=request(path,options).finally(()=>{if(writes.get(key)===promise)writes.delete(key);});
  writes.set(key,promise);return promise;
}
export async function download(path,filename) {
  const response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+getToken()}});
  if(!response.ok)throw new Error('İndirme başarısız');
  const url=URL.createObjectURL(await response.blob());
  const anchor=Object.assign(document.createElement('a'),{href:url,download:filename});
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
