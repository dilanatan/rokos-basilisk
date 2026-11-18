import {spawn} from 'node:child_process';
const children=[];
let stopping=false;
function stop(code=0) {
  if(stopping)return;
  stopping=true;
  for(const child of children)child.kill();
  process.exitCode=code;
}
function start(file,args,env) {
  const child=spawn(process.execPath,[file,...args],{stdio:'inherit',windowsHide:true,env:{...process.env,...env}});
  children.push(child);
  child.on('error',error=>{console.error(error);stop(1);});
  child.on('exit',code=>{if(!stopping)stop(code||1);});
}
start('server/src/index.js',[],{PORT:'3101',DB_PATH:':memory:',DEMO_MODE:'true',CHAT_MODE:'rules',JWT_SECRET:'isolated-browser-test-secret-at-least-32-characters',ANTHROPIC_API_KEY:'',ANTHROPIC_AUTH_TOKEN:''});
start('web/node_modules/vite/bin/vite.js',['preview','web','--host','127.0.0.1','--port','5176','--strictPort'],{API_URL:'http://127.0.0.1:3101'});
process.on('SIGINT',()=>stop());
process.on('SIGTERM',()=>stop());
process.on('exit',()=>{for(const child of children)child.kill();});
