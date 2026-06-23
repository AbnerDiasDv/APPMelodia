// Cliente HTTP para o backend Harmonia.
// O EXPO_PUBLIC_BACKEND_URL deve ser usado SEM port; o ingress encaminha /api/* p/ FastAPI.
import { storage } from '@/src/utils/storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = 'harmonia_token';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: 'aluno' | 'superadmin';
  preferred_instrument?: string | null;
  avatar?: string | null;
  is_banned: boolean;
  daily_reminder_enabled?: boolean;
  created_at?: string;
};

export async function getToken(): Promise<string | null> {
  return (await storage.secureGet(TOKEN_KEY, '')) || null;
}
export async function setToken(token: string | null) {
  if (token) await storage.secureSet(TOKEN_KEY, token);
  else await storage.secureRemove(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : ({} as T);
  if (!res.ok) {
    const msg =
      (data as { detail?: string })?.detail || `Erro ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const api = {
  // auth
  register: (b: { name: string; email: string; password: string; preferred_instrument?: string | null }) =>
    request<{ access_token: string; user: ApiUser }>('/auth/register', { method: 'POST', body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    request<{ access_token: string; user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify(b) }),
  me: () => request<ApiUser>('/auth/me'),
  updateMe: (b: Partial<ApiUser>) => request<ApiUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(b) }),

  // catalog
  instruments: () => request<any[]>('/instruments'),
  lessons: (instrument: string) => request<any[]>(`/lessons?instrument=${instrument}`),
  lesson: (id: string) => request<any>(`/lessons/${id}`),
  completeLesson: (id: string, score?: number) =>
    request<{ ok: boolean }>(`/lessons/${id}/complete`, { method: 'POST', body: JSON.stringify({ score }) }),
  chords: (instrument?: string, difficulty?: string) => {
    const qs = new URLSearchParams();
    if (instrument) qs.set('instrument', instrument);
    if (difficulty) qs.set('difficulty', difficulty);
    const s = qs.toString();
    return request<any[]>(`/chords${s ? `?${s}` : ''}`);
  },

  // practice + stats
  logPractice: (b: { instrument: string; duration_minutes: number; notes?: string }) =>
    request<{ ok: boolean }>('/practice', { method: 'POST', body: JSON.stringify(b) }),
  practice: () => request<any[]>('/practice'),
  myStats: () => request<any>('/me/stats'),

  // admin
  adminUsers: (q: { search?: string; role?: string; banned?: boolean } = {}) => {
    const p = new URLSearchParams();
    if (q.search) p.set('search', q.search);
    if (q.role) p.set('role', q.role);
    if (q.banned !== undefined) p.set('banned', String(q.banned));
    const s = p.toString();
    return request<any[]>(`/admin/users${s ? `?${s}` : ''}`);
  },
  adminPatchUser: (id: string, b: { is_banned?: boolean; role?: string }) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  adminDeleteUser: (id: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminStats: () => request<any>('/admin/stats'),
};
