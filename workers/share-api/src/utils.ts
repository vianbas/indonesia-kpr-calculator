const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'kpr_' + Array.from(bytes, (b) => BASE62[b % 62]).join('');
}

export async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function errBody(code: string, message: string): string {
  return JSON.stringify({ error: { code, message } });
}
