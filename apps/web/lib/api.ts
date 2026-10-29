export type Mode = 'lexical' | 'vector' | 'hybrid';
export type FilterKey = 'gender' | 'articleType' | 'baseColour' | 'usage';
export type Filters = Partial<Record<FilterKey, string>>;

export interface Hit {
  id: string;
  name: string;
  gender?: string;
  articleType?: string;
  baseColour?: string;
  usage?: string;
  image: string;
  score: number;
  ranks: { lexical?: number; vector?: number };
}

export interface SearchResponse {
  mode: Mode | 'image' | 'similar';
  hits: Hit[];
  timings: { embedMs?: number; lexicalMs?: number; vectorMs?: number; totalMs: number };
  embeddingCached?: boolean;
  understanding?: { productTypes: string[] };
}

export type Facets = Record<FilterKey, { value: string; count: number }[]>;
export type Stats = Record<string, { count: number; p50: number; p95: number }>;

const LIMIT = '24';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function filterParams(filters: Filters) {
  const params = new URLSearchParams({ limit: LIMIT });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params;
}

export function searchText(q: string, mode: Mode, filters: Filters) {
  const params = filterParams(filters);
  params.set('q', q);
  params.set('mode', mode);
  return request<SearchResponse>(`/api/search?${params}`);
}

export function searchImage(file: File, filters: Filters) {
  const form = new FormData();
  form.append('image', file);
  return request<SearchResponse>(`/api/search/image?${filterParams(filters)}`, { method: 'POST', body: form });
}

export function similar(id: string) {
  return request<SearchResponse>(`/api/products/${encodeURIComponent(id)}/similar?limit=${LIMIT}`);
}

export const getFacets = () => request<Facets>('/api/facets');
export const getStats = () => request<Stats>('/api/stats');
