import jwt from 'jsonwebtoken';
import { get } from './db.js';

const SECRET = process.env.JWT_SECRET || 'hackathon-demo-secret-change-me';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ROLE_RANK = { employee: 1, manager: 2, director: 3 };
export const ROLE_LABEL = { employee: 'Çalışan', manager: 'Yönetici', director: 'Direktör' };

export function signToken(user, expiresIn = '12h') {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn });
}

export function userFromToken(token) {
  if (!token) return null;
  try {
    const { sub } = jwt.verify(token, SECRET);
    return get('SELECT id,name,email,role,team,title,manager_id FROM users WHERE id = ?', sub);
  } catch {
    return null;
  }
}

export function bearer(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return req.query?.token || null; // SSE (EventSource) header gönderemez
}

export function requireAuth(req, res, next) {
  const user = userFromToken(bearer(req));
  if (!user) return res.status(401).json({ error: 'Oturum gerekli' });
  req.user = user;
  next();
}

export function requireRole(user, minRole) {
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw new HttpError(403, `Bu işlem için en az "${ROLE_LABEL[minRole]}" yetkisi gerekir.`);
  }
}
