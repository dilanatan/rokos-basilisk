import test from 'node:test';
import assert from 'node:assert/strict';
import {rateLimit} from '../server/src/rate-limit.js';
function send(middleware,req){
  const result={allowed:false,headers:{},status:200};
  const res={set(name,value){result.headers[name]=value;return this;},status(code){result.status=code;return this;},json(body){result.body=body;return this;}};
  middleware(req,res,()=>{result.allowed=true;});
  return result;
}
test('burst limit returns 429 with retry delay and resets at window boundary',t=>{
  let now=100000;
  t.mock.method(Date,'now',()=>now);
  const limiter=rateLimit(2,60000),req={ip:'127.0.0.1'};
  assert.equal(send(limiter,req).allowed,true);
  assert.equal(send(limiter,req).allowed,true);
  const blocked=send(limiter,req);
  assert.equal(blocked.allowed,false);
  assert.equal(blocked.status,429);
  assert.equal(blocked.headers['Retry-After'],'60');
  now+=59000;
  assert.equal(send(limiter,req).headers['Retry-After'],'1');
  now+=1000;
  assert.equal(send(limiter,req).allowed,true);
});
test('authenticated users have independent limits even behind the same IP',()=>{
  const limiter=rateLimit(1);
  assert.equal(send(limiter,{ip:'127.0.0.1',user:{id:4}}).allowed,true);
  assert.equal(send(limiter,{ip:'127.0.0.1',user:{id:5}}).allowed,true);
  assert.equal(send(limiter,{ip:'127.0.0.2',user:{id:4}}).status,429);
});
test('unauthenticated clients are limited independently by IP',()=>{
  const limiter=rateLimit(1);
  assert.equal(send(limiter,{ip:'127.0.0.1'}).allowed,true);
  assert.equal(send(limiter,{ip:'127.0.0.1'}).status,429);
  assert.equal(send(limiter,{ip:'127.0.0.2'}).allowed,true);
});
