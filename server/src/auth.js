import jwt from 'jsonwebtoken';
import {disconnectToken} from './notify.js';
import { randomUUID } from 'node:crypto';
import { get, run, all } from './db.js';
export const DEMO_MODE = process.env.DEMO_MODE === 'true' || (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false');
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'hackathon-demo-secret-change-me' : '');
export function validateAuthConfig() {
  if (process.env.NODE_ENV === 'production' && SECRET.length < 32) throw new Error('Production için en az 32 karakter JWT_SECRET tanımlayın.');
  if (!DEMO_MODE) throw new Error('Bu sürüm demo girişini destekler. DEMO_MODE=true ayarlayın; AD entegrasyonu henüz etkin değil.');
}
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export const ROLE_RANK={employee:1,manager:2,director:3};
export const ROLE_LABEL={employee:'Çalışan',manager:'Yönetici',director:'Direktör'};
export function signToken(user,expiresIn='12h',kind='session') {
  const jti=randomUUID();
  const token=jwt.sign({sub:user.id,role:user.role,kind},SECRET,{expiresIn,jwtid:jti,algorithm:'HS256'});
  const {exp}=jwt.decode(token);
  run('INSERT INTO auth_tokens(jti,user_id,kind,expires_at) VALUES (?,?,?,?)',jti,user.id,kind,exp);
  return token;
}
export function tokenClaims(token) {
  if(!token) return null;
  try {
    const claims=jwt.verify(token,SECRET,{algorithms:['HS256']});
    if(!get('SELECT 1 FROM auth_tokens WHERE jti=? AND user_id=? AND revoked_at IS NULL AND expires_at>?',claims.jti||'',claims.sub,Math.floor(Date.now()/1000))) return null;
    return claims;
  } catch {return null;}
}
export function userFromToken(token) {
  const claims=tokenClaims(token);
  return claims?get('SELECT id,name,email,role,team,title,manager_id FROM users WHERE id=?',claims.sub):null;
}
export function revokeToken(token) {
  const claims=tokenClaims(token);
  if(claims) {run('UPDATE auth_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE jti=?',claims.jti);disconnectToken(claims.jti);}
}
export function listApiTokens(user) {
  return all("SELECT jti,created_at,expires_at FROM auth_tokens WHERE user_id=? AND kind='api' AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC",user.id,Math.floor(Date.now()/1000));
}
export function revokeApiToken(user,jti) {
  const revoked=run("UPDATE auth_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND kind='api' AND jti=?",user.id,jti);
  if(revoked.changes)disconnectToken(jti);
  return {ok:true};
}
export function bearer(req){const h=req.headers.authorization||'';return h.startsWith('Bearer ')?h.slice(7):req.path==='/notifications/stream'?req.query?.token:null;}
export function requireAuth(req,res,next) {
  const token=bearer(req),user=userFromToken(token);
  if(!user) return res.status(401).json({error:'Oturum gerekli'});
  req.user=user;const claims=tokenClaims(token);req.tokenExpiresAt=claims.exp;req.tokenId=claims.jti;next();
}
export function requireRole(user,minRole){if(!(ROLE_RANK[user.role]>=ROLE_RANK[minRole]))throw new HttpError(403,`Bu işlem için en az "${ROLE_LABEL[minRole]}" yetkisi gerekir.`);}
