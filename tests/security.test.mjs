import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const picomatch=require('../web/node_modules/picomatch');
test('installed glob matcher is the reviewed local security fork',()=>{
  assert.equal(require('../web/node_modules/picomatch/package.json').name,'@cyberops/picomatch');
});
test('advisory patterns are rejected before regex generation',{timeout:5000},()=>{
  const script=`
    const assert=require('node:assert/strict');
    const pm=require('./web/node_modules/picomatch');
    const parse=require('./web/node_modules/picomatch/lib/parse');
    for(const pattern of ['+(*)','+(*a)','*(*a)','src/+(*a).js','+(*?a)','*(a|aa)']) {
      for(const compile of [p=>pm(p),p=>pm.makeRe(p),p=>pm.parse(p),p=>parse.fastpaths(p,{})]) {
        assert.throws(()=>compile(pattern),/Repeated extglobs are disabled/);
      }
    }
  `;
  const result=spawnSync(process.execPath,['-e',script],{encoding:'utf8',timeout:3000,windowsHide:true});
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stderr);
});
test('normal build globs still work',()=>{
  assert.equal(picomatch('src/**/*.{js,jsx}')('src/pages/Tasks.jsx'),true);
  assert.equal(picomatch('src/**/*.{js,jsx}')('src/style.css'),false);
  assert.equal(picomatch('**/*.js',{ignore:'**/node_modules/**'})('node_modules/a.js'),false);
  assert.equal(picomatch('**/!(*.test).js')('src/app.js'),true);
});
