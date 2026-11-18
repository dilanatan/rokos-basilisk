import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
process.env.DB_PATH=':memory:';
process.env.JWT_SECRET='integration-test-secret-at-least-32-characters';
process.env.DEMO_MODE='true';
process.env.ANTHROPIC_API_KEY='test-only-never-sent';
delete process.env.ANTHROPIC_AUTH_TOKEN;
delete process.env.CHAT_MODE;
const {default:Anthropic}=await import('../server/node_modules/@anthropic-ai/sdk/index.mjs');
const {app}=await import('../server/src/index.js');
const {db,get}=await import('../server/src/db.js');
let server,base,token;
before(async()=>{
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  process.env.PORT=String(server.address().port);
  base='http://127.0.0.1:'+server.address().port;
  const res=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:4})});
  token=(await res.json()).token;
});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();});
const request=(path,{method='GET',body,auth=token,...rest}={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{}),...rest.headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('REST rejects missing/query-only credentials and cross-team writes',async()=>{
  assert.equal((await request('/api/tasks',{auth:null})).status,401);
  assert.equal((await request('/api/tasks?token='+token,{auth:null})).status,401);
  assert.equal((await request('/api/tasks',{method:'POST',body:{title:'Denied',assignee:7}})).status,403);
  assert.equal((await request('/api/tasks',{method:'POST',body:{title:42}})).status,400);
  const page=await (await request('/api/tasks?paged=true&limit=2')).json();
  assert.equal(page.items.length,2);
  assert.ok(page.total>2);
});
test('MCP exposes tools but shares REST authorization',async()=>{
  const headers={Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26'};
  const list=await (await request('/mcp',{method:'POST',headers,body:{jsonrpc:'2.0',id:1,method:'tools/list',params:{}}})).json();
  assert.equal(list.result.tools.length,24);
  const res=await request('/mcp',{method:'POST',headers,body:{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'create_task',arguments:{title:'MCP denied',assignee:'7'}}}});
  const result=await res.json();
  assert.equal(result.result.isError,true);
  assert.equal(get("SELECT COUNT(*) AS n FROM tasks WHERE title='MCP denied'").n,0);
});
test('API tokens can be listed and revoked through REST',async()=>{
  const created=await (await request('/api/me/api-token',{method:'POST'})).json();
  const list=await (await request('/api/me/api-tokens')).json();
  assert.ok(list.length>0);
  assert.equal((await request('/api/me',{auth:created.token})).status,200);
  assert.equal((await request('/api/me/api-tokens/'+list.at(-1).jti,{method:'DELETE'})).status,200);
  assert.equal((await request('/api/me',{auth:created.token})).status,401);
});
test('model failure after a write never replays the mutation; request ID is idempotent',{timeout:15000},async()=>{
  const mockClient=new Anthropic({apiKey:'test-only-never-sent'});
  const prototype=Object.getPrototypeOf(mockClient.beta.messages);
  const standard=Object.getPrototypeOf(mockClient.messages);
  const original=prototype.create,originalStandard=standard.create;
  let calls=0;
  prototype.create=async()=>{
    calls++;
    if(calls===1)return {stop_reason:'tool_use',content:[{type:'tool_use',id:'test-tool',name:'create_task',input:{title:'No duplicate'}}]};
    throw new Anthropic.APIConnectionError({message:'Simulated interruption'});
  };
  standard.create=async()=>{throw new Error('Unexpected unmocked model path');};
  try{
    const body={requestId:randomUUID(),messages:[{role:'user',content:'Gorev olustur: No duplicate'}]};
    const first=await request('/api/chat',{method:'POST',body});
    assert.equal(first.status,200);
    const result=await first.json();
    assert.equal(result.partial,true);
    assert.equal(get("SELECT COUNT(*) AS n FROM tasks WHERE title='No duplicate'").n,1);
    const replay=await (await request('/api/chat',{method:'POST',body})).json();
    assert.deepEqual(replay,result);
    assert.equal(calls,2);
    const conflict=await request('/api/chat',{method:'POST',body:{...body,messages:[{role:'user',content:'Different'}]}});
    assert.equal(conflict.status,409);
  }finally{prototype.create=original;standard.create=originalStandard;}
});
