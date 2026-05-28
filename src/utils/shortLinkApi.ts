interface CreateResult {
  id: string;
  url: string;
}

function apiBase(): string {
  return (import.meta.env.VITE_SHARE_API_URL as string | undefined) ?? '';
}

export async function createShortLink(payload: string): Promise<CreateResult | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<CreateResult>;
    if (typeof data.id !== 'string' || typeof data.url !== 'string') return null;
    return { id: data.id, url: data.url };
  } catch {
    return null;
  }
}

export async function fetchShortLinkPayload(id: string): Promise<string | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/share/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { payload?: unknown };
    return typeof data.payload === 'string' ? data.payload : null;
  } catch {
    return null;
  }
}
