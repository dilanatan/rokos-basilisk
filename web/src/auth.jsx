import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken, bus } from './api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
export const ROLE_LABEL = { employee: 'Çalışan', manager: 'Yönetici', director: 'Direktör' };
export const isManager = (u) => u && (u.role === 'manager' || u.role === 'director');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  // Canlı bildirim + veri değişikliği akışı (SSE)
  useEffect(() => {
    if (!user) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(getToken())}`);
    es.addEventListener('notification', (e) => bus.dispatchEvent(new CustomEvent('notification', { detail: JSON.parse(e.data) })));
    es.addEventListener('change', (e) => bus.dispatchEvent(new CustomEvent('change', { detail: JSON.parse(e.data) })));
    return () => es.close();
  }, [user]);

  const login = useCallback(async (userId) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { userId } });
    setToken(token);
    setUser(user);
    return user;
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

/** Veriyi çeker; sunucuda ilgili varlık değişince otomatik yeniler. */
export function useLive(path, entities = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    if (!path) return;
    api(path).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  }, [path]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const fn = (e) => { if (!entities.length || entities.includes(e.detail.entity)) load(); };
    bus.addEventListener('change', fn);
    return () => bus.removeEventListener('change', fn);
  }, [load, entities.join(',')]);
  return { data, error, reload: load, setData };
}
