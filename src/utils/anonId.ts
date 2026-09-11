const ANON_ID_KEY = 'file2flow_anon_id';

export function getOrCreateAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (id) return id;
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    return 'fallback-' + Math.random().toString(36).slice(2, 11);
  }
}
