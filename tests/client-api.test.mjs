import test from 'node:test';
import assert from 'node:assert/strict';
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
const {getToken,setToken,api}=await import('../web/src/api.js');
test('removing browser storage does not resurrect an in-memory token',()=>{
  setToken('old-token');
  assert.equal(getToken(),'old-token');
  localStorage.removeItem('cyberops_token');
  assert.equal(getToken(),null);
});
test('identical concurrent writes share one request and account switch aborts it',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=(_url,options)=>new Promise((_resolve,reject)=>{
    calls++;
    options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});
  });
  try{
    setToken('account-a');
    const first=api('/tasks',{method:'POST',body:{title:'One write'}});
    const second=api('/tasks',{method:'POST',body:{title:'One write'}});
    assert.equal(first,second);
    const rejected=assert.rejects(first,e=>e.name==='AbortError');
    setToken('account-b');
    await rejected;
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;setToken(null);}
});
