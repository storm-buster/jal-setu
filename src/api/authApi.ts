import { apiFetch } from './client';

export type AuthLoginRequest = {
  username: string;
  password: string;
};

export type AuthLoginResponse = {
  token: string;
  userId: string;
};

export function login(payload: AuthLoginRequest) {
  return apiFetch<AuthLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
