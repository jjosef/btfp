import type { PetType, QuizQuestion, Thing, ThingType } from '@btfp/shared-types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: undefined }));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CurrentUser {
  id: string;
  displayName: string;
  verifiedContributor: boolean;
}

export const api = {
  listThings: (params: { q?: string; petType?: string; thingType?: string } = {}) => {
    const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
    const qs = new URLSearchParams(entries).toString();
    return request<Thing[]>(`/things${qs ? `?${qs}` : ''}`);
  },
  getThing: (id: string) => request<Thing>(`/things/${id}`),
  listPetTypes: () => request<PetType[]>('/pet-types'),
  listThingTypes: () => request<ThingType[]>('/thing-types'),
  me: () => request<CurrentUser>('/auth/me'),
  getQuiz: () => request<QuizQuestion[]>('/verification/quiz'),
  submitQuiz: (questions: QuizQuestion[], answers: number[]) =>
    request<{ verifiedContributor: boolean }>('/verification/quiz', {
      method: 'POST',
      body: JSON.stringify({ questions, answers }),
    }),
  submitContribution: (payload: Record<string, unknown>) =>
    request('/contributions', { method: 'POST', body: JSON.stringify({ payload }) }),
  listPendingContributions: () => request<unknown[]>('/contributions/pending'),
};
