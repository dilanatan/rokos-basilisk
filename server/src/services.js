/**
 * İş mantığı katmanı. REST API ve MCP server aynı fonksiyonları kullanır;
 * rol bazlı yetki kontrolleri burada yapılır.
 */
import { all, get, run, db } from './db.js';
import { HttpError, requireRole, ROLE_RANK } from './auth.js';
import { notify, broadcastChange } from './notify.js';

export const STATUS_LABEL = { todo: 'Yapılacak', in_progress: 'Devam ediyor', review: 'İncelemede', done: 'Tamamlandı' };
export const PRIORITY_LABEL = { low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik' };
export const TYPE_LABEL = { daily: 'Günlük', backup: 'Yedek', project: 'Proje', incident: 'Olay' };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso || today());
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- Kapsam
/** Kullanıcının görebildiği kullanıcı id'leri: çalışan=kendisi, yönetici=ekibi, direktör=herkes */
export function visibleUserIds(user) {
  if (user.role === 'director') return all('SELECT id FROM users').map((r) => r.id);
  if (user.role === 'manager') return [user.id, ...all('SELECT id FROM users WHERE manager_id = ?', user.id).map((r) => r.id)];
  return [user.id];
}
const inList = (ids) => `(${ids.map(Number).join(',') || 'NULL'})`;

/** "Ayşe", "ayse yilmaz", 4 gibi referansları kullanıcıya çevirir. */
export function resolveUser(ref) {
  if (ref === undefined || ref === null || ref === '') return null;
  if (typeof ref === 'number' || /^\d+$/.test(String(ref))) return get('SELECT * FROM users WHERE id = ?', Number(ref));
  const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
  const q = norm(String(ref).trim());
  const users = all('SELECT * FROM users');
  return users.find((u) => norm(u.name) === q) || users.find((u) => norm(u.name).includes(q)) || users.find((u) => norm(u.email).startsWith(q)) || null;
}

function mustResolve(ref, label = 'Kullanıcı') {
  const u = resolveUser(ref);
  if (!u) throw new HttpError(400, `${label} bulunamadı: "${ref}"`);
  return u;
}

function assertCanAssign(user, target) {
  if (target.id === user.id) return;
  if (!visibleUserIds(user).includes(target.id)) {
    throw new HttpError(403, `${target.name} kişisine görev atama yetkiniz yok (sadece kendi ekibinize atayabilirsiniz).`);
  }
}

// ---------------------------------------------------------------- Kullanıcılar
export function listUsers(user) {
  return all(
    `SELECT u.id,u.name,u.email,u.role,u.team,u.title,u.manager_id,m.name AS manager_name
     FROM users u LEFT JOIN users m ON m.id = u.manager_id ORDER BY u.id`,
  ).map((u) => ({ ...u, visible: visibleUserIds(user).includes(u.id) }));
}

export function updateUserRole(user, id, { role, manager_id }) {
  requireRole(user, 'director');
  const target = mustResolve(id);
  if (role && !ROLE_RANK[role]) throw new HttpError(400, 'Geçersiz rol');
  run('UPDATE users SET role = COALESCE(?, role), manager_id = COALESCE(?, manager_id) WHERE id = ?', role ?? null, manager_id ?? null, target.id);
  notify(target.id, { type: 'role', title: 'Yetkiniz güncellendi', body: `Yeni rolünüz: ${role}`, link: '/' });
  broadcastChange('users');
  return get('SELECT * FROM users WHERE id = ?', target.id);
}

// ---------------------------------------------------------------- Görevler
const TASK_SELECT = `
  SELECT t.*, a.name AS assignee_name, b.name AS backup_name, c.name AS creator_name,
    CASE WHEN t.status != 'done' AND t.due_date < date('now') THEN 1 ELSE 0 END AS overdue
  FROM tasks t
  LEFT JOIN users a ON a.id = t.assignee_id
  LEFT JOIN users b ON b.id = t.backup_assignee_id
  LEFT JOIN users c ON c.id = t.created_by`;

export function listTasks(user, f = {}) {
  const ids = visibleUserIds(user);
  const where = [`(t.assignee_id IN ${inList(ids)} OR t.backup_assignee_id IN ${inList(ids)} OR t.created_by = ${Number(user.id)})`];
  const p = [];
  if (f.status === 'open') where.push("t.status != 'done'");
  else if (f.status) { where.push('t.status = ?'); p.push(f.status); }
  if (f.priority) { where.push('t.priority = ?'); p.push(f.priority); }
  if (f.type) { where.push('t.type = ?'); p.push(f.type); }
  if (f.category) { where.push('t.category LIKE ?'); p.push(`%${f.category}%`); }
  if (f.assignee) {
    const a = mustResolve(f.assignee);
    where.push('(t.assignee_id = ? OR t.backup_assignee_id = ?)'); p.push(a.id, a.id);
  }
  if (f.mine === true || f.mine === 'true') { where.push('(t.assignee_id = ? OR t.backup_assignee_id = ?)'); p.push(user.id, user.id); }
  if (f.overdue === true || f.overdue === 'true') where.push("t.status != 'done' AND t.due_date < date('now')");
  if (f.due === 'today') where.push("t.due_date = date('now')");
  if (f.search) { where.push('(t.title LIKE ? OR t.description LIKE ?)'); p.push(`%${f.search}%`, `%${f.search}%`); }
  const order = `ORDER BY CASE t.status WHEN 'done' THEN 1 ELSE 0 END,
    CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.due_date`;
  return all(`${TASK_SELECT} WHERE ${where.join(' AND ')} ${order} LIMIT ${Number(f.limit) || 500}`, ...p);
}

export function getTask(user, id) {
  const t = get(`${TASK_SELECT} WHERE t.id = ?`, Number(id));
  if (!t) throw new HttpError(404, `Görev #${id} bulunamadı`);
  const ids = visibleUserIds(user);
  if (![t.assignee_id, t.backup_assignee_id].some((x) => ids.includes(x)) && t.created_by !== user.id) {
    throw new HttpError(403, 'Bu görevi görüntüleme yetkiniz yok');
  }
  t.comments = all(
    'SELECT c.*, u.name AS user_name FROM task_comments c JOIN users u ON u.id = c.user_id WHERE task_id = ? ORDER BY c.created_at',
    t.id,
  );
  return t;
}

export function createTask(user, d) {
  if (!d.title?.trim()) throw new HttpError(400, 'Görev başlığı zorunlu');
  const assignee = d.assignee ? mustResolve(d.assignee, 'Atanan kişi') : user;
  assertCanAssign(user, assignee);
  const backup = d.backup_assignee ? mustResolve(d.backup_assignee, 'Yedek kişi') : null;
  if (backup) assertCanAssign(user, backup);
  const { lastInsertRowid: id } = run(
    `INSERT INTO tasks (title,description,type,category,priority,status,assignee_id,backup_assignee_id,created_by,due_date,recurrence)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    d.title.trim(), d.description || '', d.type || 'daily', d.category || 'SOC', d.priority || 'medium', d.status || 'todo',
    assignee.id, backup?.id ?? null, user.id, d.due_date || today(), d.recurrence || 'none',
  );
  const link = `/tasks?highlight=${id}`;
  if (assignee.id !== user.id) {
    notify(assignee.id, { type: 'task_assigned', title: `${user.name} size görev atadı`, body: `[${PRIORITY_LABEL[d.priority || 'medium']}] ${d.title}`, link });
  }
  if (backup && backup.id !== user.id) {
    notify(backup.id, { type: 'task_backup', title: 'Yedek sorumlu olarak atandınız', body: d.title, link });
  }
  broadcastChange('tasks');
  return getTask(user, id);
}

export function updateTask(user, id, patch) {
  const t = getTask(user, id);
  const isOwner = [t.assignee_id, t.backup_assignee_id].includes(user.id);
  const isManager = ROLE_RANK[user.role] >= ROLE_RANK.manager;
  const reassigning = patch.assignee !== undefined || patch.backup_assignee !== undefined;
  const editingMeta = ['title', 'description', 'priority', 'type', 'category', 'due_date', 'recurrence'].some((k) => patch[k] !== undefined);
  if ((reassigning || editingMeta) && !isManager && t.created_by !== user.id) {
    throw new HttpError(403, 'Görev detaylarını ve atamayı sadece yönetici veya görevi oluşturan değiştirebilir.');
  }
  if (patch.status && !isOwner && !isManager && t.created_by !== user.id) {
    throw new HttpError(403, 'Sadece size atanan görevlerin durumunu değiştirebilirsiniz.');
  }
  if (patch.status && !STATUS_LABEL[patch.status]) throw new HttpError(400, `Geçersiz durum: ${patch.status}`);

  const sets = [];
  const p = [];
  for (const k of ['title', 'description', 'priority', 'type', 'category', 'due_date', 'recurrence', 'status']) {
    if (patch[k] !== undefined) { sets.push(`${k} = ?`); p.push(patch[k]); }
  }
  let newAssignee = null;
  if (patch.assignee !== undefined) {
    newAssignee = mustResolve(patch.assignee, 'Atanan kişi');
    assertCanAssign(user, newAssignee);
    sets.push('assignee_id = ?'); p.push(newAssignee.id);
  }
  let newBackup = null;
  if (patch.backup_assignee !== undefined) {
    newBackup = patch.backup_assignee ? mustResolve(patch.backup_assignee, 'Yedek kişi') : null;
    if (newBackup) assertCanAssign(user, newBackup);
    sets.push('backup_assignee_id = ?'); p.push(newBackup?.id ?? null);
  }
  if (patch.status === 'done' && t.status !== 'done') sets.push("completed_at = datetime('now')");
  if (patch.status && patch.status !== 'done') sets.push('completed_at = NULL');
  if (!sets.length) return t;
  sets.push("updated_at = datetime('now')");
  run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, ...p, t.id);

  const link = `/tasks?highlight=${t.id}`;
  if (newAssignee && newAssignee.id !== t.assignee_id && newAssignee.id !== user.id) {
    notify(newAssignee.id, { type: 'task_assigned', title: `${user.name} size görev atadı`, body: t.title, link });
  }
  if (newBackup && newBackup.id !== t.backup_assignee_id && newBackup.id !== user.id) {
    notify(newBackup.id, { type: 'task_backup', title: 'Yedek sorumlu olarak atandınız', body: t.title, link });
  }
  if (patch.status && patch.status !== t.status) {
    // Görevi oluşturana ve (çalışan güncellediyse) yöneticisine bilgi ver
    const targets = new Set([t.created_by, t.assignee_id]);
    if (patch.status === 'review' && user.manager_id) targets.add(user.manager_id);
    targets.delete(user.id);
    for (const uid of targets) {
      notify(uid, { type: patch.status === 'review' ? 'task_review' : 'task_status', title: `Görev durumu: ${STATUS_LABEL[patch.status]}`, body: `${t.title} — ${user.name}`, link });
    }
    // Tekrarlayan görev tamamlandıysa bir sonrakini oluştur
    if (patch.status === 'done' && t.recurrence !== 'none') {
      run(
        `INSERT INTO tasks (title,description,type,category,priority,status,assignee_id,backup_assignee_id,created_by,due_date,recurrence)
         VALUES (?,?,?,?,?,'todo',?,?,?,?,?)`,
        t.title, t.description, t.type, t.category, t.priority, t.assignee_id, t.backup_assignee_id, t.created_by,
        addDays(t.due_date, t.recurrence === 'weekly' ? 7 : 1), t.recurrence,
      );
    }
  }
  broadcastChange('tasks');
  return getTask(user, t.id);
}

export function deleteTask(user, id) {
  requireRole(user, 'manager');
  const t = getTask(user, id);
  run('DELETE FROM tasks WHERE id = ?', t.id);
  broadcastChange('tasks');
  return { deleted: t.id, title: t.title };
}

export function addComment(user, id, body) {
  const t = getTask(user, id);
  if (!body?.trim()) throw new HttpError(400, 'Yorum boş olamaz');
  run('INSERT INTO task_comments (task_id,user_id,body) VALUES (?,?,?)', t.id, user.id, body.trim());
  for (const uid of new Set([t.assignee_id, t.created_by])) {
    if (uid && uid !== user.id) notify(uid, { type: 'comment', title: `${user.name} yorum yaptı`, body: `${t.title}: ${body.slice(0, 80)}`, link: `/tasks?highlight=${t.id}` });
  }
  broadcastChange('tasks');
  return getTask(user, t.id);
}

// ---------------------------------------------------------------- Etkinlikler
export function listEvents(user, f = {}) {
  const where = [];
  if (f.scope === 'upcoming') where.push("COALESCE(e.end_date, e.start_date) >= date('now')");
  if (f.scope === 'past') where.push("COALESCE(e.end_date, e.start_date) < date('now')");
  if (f.type) where.push(`e.type = '${String(f.type).replace(/'/g, '')}'`);
  if (f.participation) where.push(`e.participation = '${String(f.participation).replace(/'/g, '')}'`);
  const events = all(
    `SELECT e.*, u.name AS creator_name FROM events e LEFT JOIN users u ON u.id = e.created_by
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.start_date ${f.scope === 'past' ? 'DESC' : 'ASC'}`,
  );
  const parts = all('SELECT p.*, u.name, u.team FROM event_participants p JOIN users u ON u.id = p.user_id');
  return events.map((e) => {
    const participants = parts.filter((p) => p.event_id === e.id);
    return { ...e, participants, joined: participants.some((p) => p.user_id === user.id) };
  });
}

export function createEvent(user, d) {
  requireRole(user, 'manager');
  if (!d.title || !d.start_date || !d.type) throw new HttpError(400, 'Başlık, tür ve başlangıç tarihi zorunlu');
  const { lastInsertRowid: id } = run(
    'INSERT INTO events (title,type,participation,start_date,end_date,location,description,created_by) VALUES (?,?,?,?,?,?,?,?)',
    d.title, d.type, d.participation || 'corporate', d.start_date, d.end_date || d.start_date, d.location || '', d.description || '', user.id,
  );
  const audience = d.participation === 'individual' ? visibleUserIds(user) : all('SELECT id FROM users').map((r) => r.id);
  for (const uid of audience) {
    if (uid !== user.id) notify(uid, { type: 'event', title: 'Yeni etkinlik', body: `${d.title} — ${d.start_date}`, link: `/events?highlight=${id}` });
  }
  broadcastChange('events');
  return listEvents(user).find((e) => e.id === Number(id));
}

export function joinEvent(user, id, role = 'attendee', targetRef) {
  const ev = get('SELECT * FROM events WHERE id = ?', Number(id));
  if (!ev) throw new HttpError(404, 'Etkinlik bulunamadı');
  let target = user;
  if (targetRef) {
    target = mustResolve(targetRef);
    if (target.id !== user.id) { requireRole(user, 'manager'); assertCanAssign(user, target); }
  }
  run('INSERT OR REPLACE INTO event_participants (event_id,user_id,role,status) VALUES (?,?,?,?)', ev.id, target.id, role, 'registered');
  if (target.id !== user.id) notify(target.id, { type: 'event', title: 'Etkinliğe kaydedildiniz', body: ev.title, link: `/events?highlight=${ev.id}` });
  broadcastChange('events');
  return listEvents(user).find((e) => e.id === ev.id);
}

export function leaveEvent(user, id) {
  run('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?', Number(id), user.id);
  broadcastChange('events');
  return listEvents(user).find((e) => e.id === Number(id));
}

// ---------------------------------------------------------------- Yetkinlikler
export function listCompetencies(user, f = {}) {
  let ids = visibleUserIds(user);
  if (f.user) {
    const u = mustResolve(f.user);
    if (!ids.includes(u.id)) throw new HttpError(403, `${u.name} kişisinin yetkinliklerini görme yetkiniz yok`);
    ids = [u.id];
  }
  const users = all(`SELECT id,name,team,title,role FROM users WHERE id IN ${inList(ids)} ORDER BY team, name`);
  const skills = all(`SELECT * FROM skills WHERE user_id IN ${inList(ids)} ORDER BY level DESC`);
  const certs = all(`SELECT *, CASE WHEN expires_at IS NOT NULL AND expires_at < date('now','+60 day') THEN 1 ELSE 0 END AS expiring
                     FROM certifications WHERE user_id IN ${inList(ids)}`);
  const evs = all(`SELECT p.user_id, e.title, e.type, e.start_date, p.role, p.status FROM event_participants p JOIN events e ON e.id = p.event_id WHERE p.user_id IN ${inList(ids)}`);
  return users.map((u) => ({
    ...u,
    skills: skills.filter((s) => s.user_id === u.id),
    certifications: certs.filter((c) => c.user_id === u.id),
    events: evs.filter((e) => e.user_id === u.id),
  }));
}

export function upsertSkill(user, d) {
  const target = d.user ? mustResolve(d.user) : user;
  if (target.id !== user.id) { requireRole(user, 'manager'); assertCanAssign(user, target); }
  const level = Math.max(1, Math.min(5, Number(d.level) || 1));
  run(
    `INSERT INTO skills (user_id,name,category,level) VALUES (?,?,?,?)
     ON CONFLICT(user_id,name) DO UPDATE SET level = excluded.level, category = excluded.category`,
    target.id, d.name, d.category || 'Genel', level,
  );
  broadcastChange('competencies');
  return listCompetencies(user, { user: target.id })[0];
}

export function addCertification(user, d) {
  const target = d.user ? mustResolve(d.user) : user;
  if (target.id !== user.id) { requireRole(user, 'manager'); assertCanAssign(user, target); }
  run('INSERT INTO certifications (user_id,name,issuer,obtained_at,expires_at) VALUES (?,?,?,?,?)',
    target.id, d.name, d.issuer || '', d.obtained_at || today(), d.expires_at || null);
  broadcastChange('competencies');
  return listCompetencies(user, { user: target.id })[0];
}

// ---------------------------------------------------------------- Duyurular (iletişim)
export function listAnnouncements(user) {
  return all(
    `SELECT a.*, u.name AS author_name, u.title AS author_title FROM announcements a JOIN users u ON u.id = a.author_id
     WHERE a.audience = 'all' OR a.audience = ? OR a.author_id = ? ORDER BY a.created_at DESC`,
    user.team, user.id,
  );
}

export function createAnnouncement(user, d) {
  requireRole(user, 'manager');
  if (!d.title || !d.body) throw new HttpError(400, 'Başlık ve içerik zorunlu');
  const audience = user.role === 'director' ? d.audience || 'all' : user.team;
  run('INSERT INTO announcements (title,body,audience,author_id) VALUES (?,?,?,?)', d.title, d.body, audience, user.id);
  const targets = audience === 'all' ? all('SELECT id FROM users') : all('SELECT id FROM users WHERE team = ?', audience);
  for (const { id } of targets) if (id !== user.id) notify(id, { type: 'announcement', title: `Duyuru: ${d.title}`, body: d.body.slice(0, 100), link: '/announcements' });
  broadcastChange('announcements');
  return listAnnouncements(user)[0];
}

// ---------------------------------------------------------------- Raporlama
export function reportSummary(user, f = {}) {
  requireRole(user, 'manager');
  let ids = visibleUserIds(user);
  if (f.team) ids = all(`SELECT id FROM users WHERE team LIKE ? AND id IN ${inList(ids)}`, `%${f.team}%`).map((r) => r.id);
  const scope = `t.assignee_id IN ${inList(ids)}`;
  const tasks = all(`${TASK_SELECT} WHERE ${scope}`);
  const count = (key) => tasks.reduce((acc, t) => ((acc[t[key]] = (acc[t[key]] || 0) + 1), acc), {});
  const done = tasks.filter((t) => t.status === 'done');
  const perUser = all(`SELECT id,name,team,title FROM users WHERE id IN ${inList(ids)}`).map((u) => {
    const mine = tasks.filter((t) => t.assignee_id === u.id);
    return {
      ...u,
      total: mine.length,
      open: mine.filter((t) => t.status !== 'done').length,
      done: mine.filter((t) => t.status === 'done').length,
      overdue: mine.filter((t) => t.overdue).length,
      critical_open: mine.filter((t) => t.priority === 'critical' && t.status !== 'done').length,
    };
  });
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today(), -i);
    trend.push({
      date: d.slice(5),
      created: tasks.filter((t) => t.created_at.slice(0, 10) === d).length,
      completed: done.filter((t) => t.completed_at?.slice(0, 10) === d).length,
    });
  }
  const teams = [...new Set(perUser.map((u) => u.team))].map((team) => {
    const m = perUser.filter((u) => u.team === team);
    const sum = (k) => m.reduce((a, u) => a + u[k], 0);
    return { team, total: sum('total'), open: sum('open'), done: sum('done'), overdue: sum('overdue') };
  });
  const eventStats = all(
    `SELECT e.participation, COUNT(DISTINCT e.id) AS events, COUNT(p.user_id) AS participants
     FROM events e LEFT JOIN event_participants p ON p.event_id = e.id AND p.user_id IN ${inList(ids)} GROUP BY e.participation`,
  );
  const expiringCerts = all(
    `SELECT c.name, c.expires_at, u.name AS user_name FROM certifications c JOIN users u ON u.id = c.user_id
     WHERE c.user_id IN ${inList(ids)} AND c.expires_at IS NOT NULL AND c.expires_at < date('now','+60 day') ORDER BY c.expires_at`,
  );
  return {
    scope: user.role === 'director' ? (f.team ? `Takım: ${f.team}` : 'Tüm organizasyon') : `${user.team} ekibi`,
    generated_at: new Date().toISOString(),
    totals: {
      total: tasks.length,
      open: tasks.length - done.length,
      done: done.length,
      overdue: tasks.filter((t) => t.overdue).length,
      critical_open: tasks.filter((t) => t.priority === 'critical' && t.status !== 'done').length,
      completion_rate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    },
    by_status: count('status'),
    by_priority: count('priority'),
    by_type: count('type'),
    by_category: count('category'),
    per_user: perUser,
    teams,
    trend,
    overdue_tasks: tasks.filter((t) => t.overdue).map((t) => ({ id: t.id, title: t.title, assignee: t.assignee_name, due_date: t.due_date, priority: t.priority })),
    event_stats: eventStats,
    expiring_certs: expiringCerts,
  };
}

export function reportCsv(user) {
  requireRole(user, 'manager');
  const ids = visibleUserIds(user);
  const rows = all(`${TASK_SELECT} WHERE t.assignee_id IN ${inList(ids)} ORDER BY t.id`);
  const head = ['ID', 'Başlık', 'Tür', 'Kategori', 'Öncelik', 'Durum', 'Sorumlu', 'Yedek', 'Bitiş', 'Gecikmiş', 'Tamamlanma'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((t) => [t.id, t.title, TYPE_LABEL[t.type], t.category, PRIORITY_LABEL[t.priority], STATUS_LABEL[t.status], t.assignee_name, t.backup_name, t.due_date, t.overdue ? 'Evet' : 'Hayır', t.completed_at].map(esc).join(';'));
  return '﻿' + [head.map(esc).join(';'), ...lines].join('\r\n');
}

/** Toplu bildirim: kapsamdaki herkese açık/gecikmiş görev özetini gönderir. */
export function sendDigest(user) {
  requireRole(user, 'manager');
  const ids = visibleUserIds(user).filter((id) => id !== user.id);
  let sent = 0;
  for (const uid of ids) {
    const open = get("SELECT COUNT(*) AS c FROM tasks WHERE assignee_id = ? AND status != 'done'", uid).c;
    const overdue = get("SELECT COUNT(*) AS c FROM tasks WHERE assignee_id = ? AND status != 'done' AND due_date < date('now')", uid).c;
    notify(uid, {
      type: 'digest',
      title: 'Günlük görev özeti',
      body: `${open} açık görev${overdue ? `, ${overdue} gecikmiş görev` : ''}. (${user.name} tarafından gönderildi)`,
      link: overdue ? '/tasks?overdue=true&mine=true' : '/tasks?mine=true',
    });
    sent++;
  }
  const s = reportSummary(user);
  notify(user.id, { type: 'report', title: 'Rapor özeti gönderildi', body: `${sent} kişiye bildirim gitti. Açık: ${s.totals.open}, gecikmiş: ${s.totals.overdue}.`, link: '/reports' });
  return { sent, totals: s.totals };
}

// ---------------------------------------------------------------- Bildirimler
export function listNotifications(user, f = {}) {
  return all(`SELECT * FROM notifications WHERE user_id = ? ${f.unread ? 'AND is_read = 0' : ''} ORDER BY id DESC LIMIT 50`, user.id);
}
export function markNotificationsRead(user, id) {
  if (id) run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', Number(id), user.id);
  else run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', user.id);
  return { ok: true };
}

/** Gecikmiş görevler için günde bir kez otomatik bildirim üretir. */
export function checkOverdue() {
  const rows = all(`SELECT id,title,assignee_id FROM tasks WHERE status != 'done' AND due_date < date('now') AND assignee_id IS NOT NULL`);
  for (const t of rows) {
    const link = `/tasks?highlight=${t.id}`;
    const exists = get("SELECT 1 FROM notifications WHERE user_id = ? AND type = 'overdue' AND link = ? AND date(created_at) = date('now')", t.assignee_id, link);
    if (!exists) notify(t.assignee_id, { type: 'overdue', title: 'Görev gecikti', body: t.title, link });
  }
}

// ---------------------------------------------------------------- Dashboard
export function dashboard(user) {
  const mine = listTasks(user, { mine: true });
  const open = mine.filter((t) => t.status !== 'done');
  return {
    my_open: open.length,
    my_overdue: open.filter((t) => t.overdue).length,
    my_critical: open.filter((t) => t.priority === 'critical').length,
    my_backup: open.filter((t) => t.backup_assignee_id === user.id).length,
    my_done_week: mine.filter((t) => t.completed_at && t.completed_at >= addDays(today(), -7)).length,
    today_tasks: open.filter((t) => t.due_date <= today()).slice(0, 8),
    upcoming_events: listEvents(user, { scope: 'upcoming' }).slice(0, 4),
    announcements: listAnnouncements(user).slice(0, 3),
    team: ROLE_RANK[user.role] >= ROLE_RANK.manager ? reportSummary(user).totals : null,
  };
}

export { db };
