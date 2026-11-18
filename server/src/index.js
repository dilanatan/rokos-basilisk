import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed.js';
import { get } from './db.js';
import * as svc from './services.js';
import { requireAuth, signToken, HttpError } from './auth.js';
import { subscribe } from './notify.js';
import { mcpHandler } from './mcp.js';
import { chat } from './chat.js';

seed(); // ilk açılışta tablo + demo verisi
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Async handler + HttpError → JSON
const h = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) res.status(status).json({ error: e.message });
  }
};

// ------------------------------------------------ Auth (demo: şifresiz rol seçimi)
app.get('/api/health', (req, res) => res.json({ ok: true, claude: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) }));
app.get('/api/auth/demo-users', h(() => svc.listUsers({ role: 'director' }).map(({ id, name, role, team, title }) => ({ id, name, role, team, title }))));
app.post('/api/auth/login', h((req) => {
  const user = get('SELECT id,name,email,role,team,title,manager_id FROM users WHERE id = ? OR email = ?', Number(req.body.userId) || 0, req.body.email || '');
  if (!user) throw new HttpError(401, 'Kullanıcı bulunamadı');
  return { token: signToken(user), user };
}));

const api = express.Router();
api.use(requireAuth);
api.get('/me', h((req) => req.user));
api.post('/me/api-token', h((req) => ({ token: signToken(req.user, '30d'), expires_in: '30 gün' })));
api.get('/dashboard', h((req) => svc.dashboard(req.user)));
api.get('/users', h((req) => svc.listUsers(req.user)));
api.patch('/users/:id', h((req) => svc.updateUserRole(req.user, req.params.id, req.body)));

api.get('/tasks', h((req) => svc.listTasks(req.user, req.query)));
api.post('/tasks', h((req) => svc.createTask(req.user, req.body)));
api.get('/tasks/:id', h((req) => svc.getTask(req.user, req.params.id)));
api.patch('/tasks/:id', h((req) => svc.updateTask(req.user, req.params.id, req.body)));
api.delete('/tasks/:id', h((req) => svc.deleteTask(req.user, req.params.id)));
api.post('/tasks/:id/comments', h((req) => svc.addComment(req.user, req.params.id, req.body.body)));

api.get('/events', h((req) => svc.listEvents(req.user, req.query)));
api.post('/events', h((req) => svc.createEvent(req.user, req.body)));
api.post('/events/:id/join', h((req) => svc.joinEvent(req.user, req.params.id, req.body?.role, req.body?.user)));
api.delete('/events/:id/join', h((req) => svc.leaveEvent(req.user, req.params.id)));

api.get('/competencies', h((req) => svc.listCompetencies(req.user, req.query)));
api.post('/competencies/skills', h((req) => svc.upsertSkill(req.user, req.body)));
api.post('/competencies/certifications', h((req) => svc.addCertification(req.user, req.body)));

api.get('/announcements', h((req) => svc.listAnnouncements(req.user)));
api.post('/announcements', h((req) => svc.createAnnouncement(req.user, req.body)));

api.get('/reports/summary', h((req) => svc.reportSummary(req.user, req.query)));
api.get('/reports/tasks.csv', h((req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="gorev-raporu-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(svc.reportCsv(req.user));
}));
api.post('/reports/digest', h((req) => svc.sendDigest(req.user)));

api.get('/notifications', h((req) => svc.listNotifications(req.user, req.query)));
api.post('/notifications/read', h((req) => svc.markNotificationsRead(req.user, req.body?.id)));
api.get('/notifications/stream', (req, res) => subscribe(req.user.id, res));

api.post('/chat', h(async (req) => {
  const token = req.headers.authorization?.slice(7) || req.query.token;
  return chat(req.user, token, req.body.messages || []);
}));
app.use('/api', api);

// ------------------------------------------------ MCP (Streamable HTTP)
app.post('/mcp', mcpHandler);
app.get('/mcp', (req, res) => res.status(405).json({ error: 'Stateless MCP: sadece POST desteklenir' }));
app.delete('/mcp', (req, res) => res.status(405).end());

// ------------------------------------------------ Prod: build edilmiş önyüzü servis et
const webDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/(api|mcp)).*/, (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

setInterval(() => svc.checkOverdue(), 60 * 60 * 1000);
setTimeout(() => svc.checkOverdue(), 3000);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`CyberOps API  → http://localhost:${PORT}/api`);
  console.log(`MCP endpoint  → http://localhost:${PORT}/mcp`);
  console.log(`Chat modu     → ${process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? 'Claude (' + (process.env.CLAUDE_MODEL || 'claude-opus-5-5') + ')' : 'kural tabanlı (ANTHROPIC_API_KEY yok)'}`);
});
