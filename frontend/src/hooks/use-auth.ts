'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface AuthContext {
  jwt: { sub: string; tenantId: number; roles: string[]; issuer: string };
  user: { id: string; externalSubject: string; displayName: string; email: string | null };
  membership: { id: string; role: string; isActive: boolean };
}

export function useAuth() {
  const [context, setContext] = useState<AuthContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await api.get<AuthContext>('/auth/context');
      setContext(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auth failed');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('token');
    window.location.href = '/login';
  }, []);

  return { context, loading, error, logout, refresh, isAuthenticated: !!context };
}
