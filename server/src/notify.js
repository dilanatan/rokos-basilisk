import { run, get } from './db.js';

/** userId -> Set<res> : açık SSE bağlantıları */
const streams = new Map();

export function subscribe(userId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');
  if (!streams.has(userId)) streams.set(userId, new Set());
  streams.get(userId).add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  res.on('close', () => {
    clearInterval(ping);
    streams.get(userId)?.delete(res);
  });
}

function push(userId, event, data) {
  for (const res of streams.get(userId) || []) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function notify(userId, { type, title, body = '', link = '' }) {
  if (!userId) return null;
  const { lastInsertRowid } = run(
    'INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)',
    userId, type, title, body, link,
  );
  const n = get('SELECT * FROM notifications WHERE id = ?', lastInsertRowid);
  push(userId, 'notification', n);
  return n;
}

/** Veri değişikliklerini açık istemcilere duyurur (sayfalar otomatik yenilenir). */
export function broadcastChange(entity) {
  for (const userId of streams.keys()) push(userId, 'change', { entity, at: Date.now() });
}
