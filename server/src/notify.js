import { run, get, afterCommit } from './db.js';
const streams = new Map();
export function subscribe(userId, res, expiresAt, tokenId) {
  res.tokenId=tokenId;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(': connected\n\n');
  if (!streams.has(userId)) streams.set(userId, new Set());
  streams.get(userId).add(res);
  const ping = setInterval(() => { if (!res.destroyed) res.write(': ping\n\n'); }, 25000);
  const expiry = expiresAt ? setTimeout(() => res.end(), Math.min(2147483647, Math.max(0, expiresAt * 1000 - Date.now()))) : null;
  res.on('close', () => { clearInterval(ping); clearTimeout(expiry); streams.get(userId)?.delete(res); if (!streams.get(userId)?.size) streams.delete(userId); });
}
function push(userId, event, data) {
  for (const res of streams.get(userId) || []) {
    if (res.destroyed || res.writableEnded) continue;
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { res.end(); }
  }
}
export function notify(userId, { type, title, body = '', link = '' }) {
  if (!userId) return null;
  const { lastInsertRowid } = run('INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)', userId,type,title,body,link);
  const n = get('SELECT * FROM notifications WHERE id=?', lastInsertRowid);
  afterCommit(() => push(userId,'notification',n));
  return n;
}
export function broadcastChange(entity) { afterCommit(() => { for (const id of streams.keys()) push(id,'change',{entity}); }); }
export function notificationsChanged(userId) { afterCommit(() => push(userId,'change',{entity:'notifications'})); }

export function disconnectToken(tokenId) { for(const clients of streams.values()) for(const res of clients) if(res.tokenId===tokenId) res.end(); }
