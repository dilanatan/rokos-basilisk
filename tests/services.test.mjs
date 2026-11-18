import test, {beforeEach, after} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
process.env.DB_PATH=':memory:';
process.env.JWT_SECRET='unit-test-secret-at-least-32-characters';
const {db,get,all,run,migrate}=await import('../server/src/db.js');
const {seed}=await import('../server/src/seed.js');
const svc=await import('../server/src/services.js');
const auth=await import('../server/src/auth.js');
const {subscribe}=await import('../server/src/notify.js');
const user=id=>get('SELECT * FROM users WHERE id=?',id);
const denied=fn=>assert.throws(fn,e=>e.status===403);
beforeEach(()=>seed({reset:true}));
after(()=>db.close());

test('report, CSV and digest use exactly the selected team',()=>{
  const director=user(1),team='SOC';
  const report=svc.reportSummary(director,{team});
  assert.ok(report.per_user.length>0);
  assert.ok(report.per_user.every(u=>u.team===team));
  const csv=svc.reportCsv(director,{team});
  assert.equal(csv.split('\r\n').length-1,report.totals.total);
  const before=get('SELECT MAX(id) AS id FROM notifications').id;
  const digest=svc.sendDigest(director,{team});
  const recipients=all("SELECT u.team FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.id>? AND n.type='digest'",before);
  assert.equal(recipients.length,digest.sent);
  assert.ok(recipients.length>0);
  assert.ok(recipients.every(u=>u.team===team));
  assert.deepEqual(digest.totals,report.totals);
  assert.equal(svc.sendDigest(director,{team:'%'}).sent,0);
  assert.equal(svc.reportSummary(director,{team:'SO'}).totals.total,0);
});
test('team filtering cannot expand manager permissions',()=>{
  assert.equal(svc.reportSummary(user(2),{team:'Ofansif Güvenlik'}).totals.total,0);
  denied(()=>svc.reportSummary(user(4)));
  denied(()=>svc.sendDigest(user(4)));
});
test('paging reaches every task beyond 500 and dashboard remains accurate',()=>{
  db.exec('BEGIN');
  for(let i=0;i<501;i++)run("INSERT INTO tasks(title,assignee_id,created_by,due_date) VALUES (?,4,4,'2099-01-01')",'Paging '+i);
  db.exec('COMMIT');
  const first=svc.listTasksPage(user(4),{limit:50});
  const ids=[];
  for(let offset=0;offset<first.total;offset+=50){
    const page=svc.listTasksPage(user(4),{limit:50,offset});
    ids.push(...page.items.map(t=>t.id));
  }
  assert.ok(first.total>500);
  assert.equal(new Set(ids).size,first.total);
  assert.equal(ids.length,first.total);
  const expected=get("SELECT COUNT(*) AS n FROM tasks WHERE (assignee_id=4 OR backup_assignee_id=4) AND status!='done'").n;
  assert.equal(svc.dashboard(user(4)).my_open,expected);
  assert.throws(()=>svc.listTasksPage(user(4),{offset:-1}),e=>e.status===400);
});
test('optional skill category can be empty and defaults to Genel',()=>{
  const result=svc.upsertSkill(user(4),{name:'Regression skill',category:'',level:3});
  assert.equal(result.skills.find(s=>s.name==='Regression skill').category,'Genel');
});
test('invalid dates, titles and unexpected fields produce 400 without mutations',()=>{
  const before=get('SELECT COUNT(*) AS n FROM tasks').n;
  for(const payload of [{title:42},{title:' '},{title:'Invalid',due_date:'2026-02-30'},{title:'Invalid',role:'director'}]){
    assert.throws(()=>svc.createTask(user(4),payload),e=>e.status===400);
  }
  assert.equal(get('SELECT COUNT(*) AS n FROM tasks').n,before);
});
test('recurrence creates only one successor and inherits updated fields',()=>{
  const task=svc.createTask(user(2),{title:'Recurring',assignee:4,recurrence:'daily',due_date:'2099-01-01'});
  svc.updateTask(user(2),task.id,{status:'done',title:'Updated',priority:'critical',assignee:5,due_date:'2099-01-03'});
  svc.updateTask(user(2),task.id,{status:'todo'});
  svc.updateTask(user(2),task.id,{status:'done'});
  const children=all('SELECT * FROM tasks WHERE recurrence_parent_id=?',task.id);
  assert.equal(children.length,1);
  assert.equal(children[0].title,'Updated');
  assert.equal(children[0].assignee_id,5);
  assert.equal(children[0].priority,'critical');
  assert.equal(children[0].due_date,'2099-01-04');
});
test('failed recurrence rolls back task, notifications and audit together',()=>{
  const task=svc.createTask(user(4),{title:'Corrupt legacy date',recurrence:'daily'});
  run("UPDATE tasks SET due_date='not-a-date' WHERE id=?",task.id);
  const before={notes:get('SELECT COUNT(*) AS n FROM notifications').n,audit:get('SELECT COUNT(*) AS n FROM audit_log').n};
  assert.throws(()=>svc.updateTask(user(4),task.id,{status:'done'}));
  assert.equal(svc.getTask(user(4),task.id).status,'todo');
  assert.equal(get('SELECT COUNT(*) AS n FROM notifications').n,before.notes);
  assert.equal(get('SELECT COUNT(*) AS n FROM audit_log').n,before.audit);
});
test('CSV neutralizes spreadsheet formulas',()=>{
  svc.createTask(user(2),{title:'=1+1',assignee:4});
  assert.ok(svc.reportCsv(user(2)).includes('"\'=1+1"'));
});
test('role changes protect last director and reject management cycles',()=>{
  assert.throws(()=>svc.updateUserRole(user(1),1,{role:'employee'}),e=>e.status===400);
  assert.throws(()=>svc.updateUserRole(user(1),1,{manager_id:2}),e=>e.status===400);
  assert.equal(svc.updateUserRole(user(1),4,{manager_id:null}).manager_id,null);
  denied(()=>svc.updateUserRole(user(4),4,{role:'director'}));
});
test('tasks and competencies enforce employee and team boundaries',()=>{
  const privateTask=svc.createTask(user(3),{title:'Other team',assignee:7});
  denied(()=>svc.getTask(user(4),privateTask.id));
  denied(()=>svc.updateTask(user(2),privateTask.id,{status:'done'}));
  denied(()=>svc.createTask(user(4),{title:'Forbidden',assignee:7}));
  denied(()=>svc.listCompetencies(user(4),{user:7}));
});
test('events preserve attendance and reject invalid/cancelled registration',()=>{
  const event=svc.createEvent(user(2),{title:'Training',type:'training',start_date:'2099-01-01',end_date:'2099-01-03'});
  svc.joinEvent(user(4),event.id);
  svc.updateAttendance(user(2),event.id,4,{status:'attended'});
  svc.joinEvent(user(4),event.id,'speaker');
  assert.equal(svc.listEvents(user(4)).find(e=>e.id===event.id).participants[0].status,'attended');
  denied(()=>svc.updateEvent(user(3),event.id,{title:'Forbidden'}));
  assert.throws(()=>svc.updateEvent(user(2),event.id,{end_date:'2098-01-01'}),e=>e.status===400);
  svc.updateEvent(user(2),event.id,{status:'cancelled'});
  assert.throws(()=>svc.joinEvent(user(5),event.id),e=>e.status===400);
});
test('certifications support own edits/deletion and block other users',()=>{
  svc.addCertification(user(4),{name:'Test cert',obtained_at:'2026-01-01',expires_at:'2027-01-01'});
  const cert=get("SELECT * FROM certifications WHERE name='Test cert'");
  denied(()=>svc.updateCertification(user(7),cert.id,{name:'No'}));
  svc.updateCertification(user(4),cert.id,{name:'Updated cert',expires_at:null});
  assert.equal(get('SELECT * FROM certifications WHERE id=?',cert.id).expires_at,null);
  svc.deleteCertification(user(4),cert.id);
  assert.equal(get('SELECT * FROM certifications WHERE id=?',cert.id),null);
});
test('tokens are revocable, read current roles and cannot revoke another owner',()=>{
  const token=auth.signToken(user(4),'1h','api');
  const claims=auth.tokenClaims(token);
  auth.revokeApiToken(user(7),claims.jti);
  assert.ok(auth.userFromToken(token));
  svc.updateUserRole(user(1),4,{role:'manager'});
  assert.equal(auth.userFromToken(token).role,'manager');
  auth.revokeApiToken(user(4),claims.jti);
  assert.equal(auth.userFromToken(token),null);
});
test('revocation closes already connected notification streams',()=>{
  const token=auth.signToken(user(4));
  const claims=auth.tokenClaims(token);
  const response=new EventEmitter();
  response.writeHead=()=>{};
  response.write=()=>{};
  response.end=()=>{response.writableEnded=true;response.emit('close');};
  subscribe(4,response,claims.exp,claims.jti);
  auth.revokeToken(token);
  assert.equal(response.writableEnded,true);
});
test('unread count includes notifications older than the latest 50',()=>{
  for(let i=0;i<60;i++)run("INSERT INTO notifications(user_id,type,title) VALUES (4,'test','Unread')");
  assert.ok(svc.unreadNotifications(user(4)).count>50);
  svc.markNotificationsRead(user(4));
  assert.equal(svc.unreadNotifications(user(4)).count,0);
});
test('schema migrations can be rerun without losing records',()=>{
  const before=get('SELECT COUNT(*) AS n FROM tasks').n;
  migrate();migrate();
  assert.equal(get('SELECT COUNT(*) AS n FROM tasks').n,before);
  assert.equal(get('SELECT COUNT(*) AS n FROM schema_migrations').n,1);
});

test('long-lived API token streams do not overflow the Node timer',async()=>{
  const token=auth.signToken(user(4),'30d','api');
  const claims=auth.tokenClaims(token);
  const response=new EventEmitter();
  response.writeHead=()=>{};
  response.write=()=>{};
  response.end=()=>{response.writableEnded=true;response.emit('close');};
  try{
    subscribe(4,response,claims.exp,claims.jti);
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.notEqual(response.writableEnded,true);
  }finally{response.end();}
});
