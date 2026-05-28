import { generateId, hashIp, errBody } from './utils';

export interface Env {
  DB: D1Database;
  CORS_ORIGIN: string;
  IP_HASH_SECRET: string;
  TURNSTILE_SECRET?: string;
  MAX_PAYLOAD_BYTES?: string;
  RATE_LIMIT_PER_MINUTE?: string;
  SHARE_EXPIRY_DAYS?: string;
}

const ID_RE = /^kpr_[A-Za-z0-9]{8}$/;
const JSON_CT = 'application/json';

function resolveOrigin(origin: string, corsOrigin: string): string {
  const allowed = corsOrigin.split(',').map((s) => s.trim());
  return allowed.includes(origin) || allowed.includes('*') ? origin : allowed[0] ?? '*';
}

function cors(origin: string, corsOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(origin, corsOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function err(
  status: number,
  code: string,
  message: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(errBody(code, message), {
    status,
    headers: { 'Content-Type': JSON_CT, ...extra },
  });
}

function ok(body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': JSON_CT, ...extra },
  });
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

async function handleCreate(
  request: Request,
  env: Env,
  requestUrl: URL,
  h: Record<string, string>,
): Promise<Response> {
  const maxBytes = Math.min(parseInt(env.MAX_PAYLOAD_BYTES ?? '10240'), 65536);
  const rateLimit = parseInt(env.RATE_LIMIT_PER_MINUTE ?? '10');
  const expiryDays = parseInt(env.SHARE_EXPIRY_DAYS ?? '90');

  const ct = request.headers.get('Content-Type') ?? '';
  if (!ct.includes('application/json')) {
    return err(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected application/json', h);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return err(400, 'READ_ERROR', 'Failed to read request body', h);
  }
  if (raw.length > maxBytes) {
    return err(413, 'PAYLOAD_TOO_LARGE', 'Payload exceeds size limit', h);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return err(400, 'INVALID_JSON', 'Invalid JSON body', h);
  }

  const { payload, token } = body;
  if (typeof payload !== 'string' || payload.length === 0 || payload.length > maxBytes) {
    return err(400, 'INVALID_PAYLOAD', 'payload must be a non-empty string within size limit', h);
  }

  const clientIp =
    request.headers.get('CF-Connecting-IP') ??
    (request.headers.get('X-Forwarded-For') ?? '').split(',')[0].trim() ||
    'unknown';
  const ipHash = await hashIp(clientIp, env.IP_HASH_SECRET ?? 'dev-secret');

  // Optional Turnstile — skip entirely when secret is not configured
  if (env.TURNSTILE_SECRET) {
    if (typeof token !== 'string' || token.length === 0) {
      return err(400, 'MISSING_TOKEN', 'Turnstile token required', h);
    }
    const valid = await verifyTurnstile(token, env.TURNSTILE_SECRET, clientIp);
    if (!valid) {
      return err(403, 'INVALID_TOKEN', 'Turnstile verification failed', h);
    }
  }

  // Rate limit: count creates from this IP hash in the last 60 s
  const windowStart = Math.floor(Date.now() / 1000) - 60;
  const rateRow = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM shared_scenarios WHERE ip_hash = ? AND created_at >= ?',
  )
    .bind(ipHash, windowStart)
    .first<{ cnt: number }>();

  if ((rateRow?.cnt ?? 0) >= rateLimit) {
    return err(429, 'RATE_LIMITED', 'Too many share requests — try again in a minute', {
      ...h,
      'Retry-After': '60',
    });
  }

  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiryDays * 86400;

  await env.DB.prepare(
    'INSERT INTO shared_scenarios (id, payload, created_at, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, payload, now, ipHash, expiresAt)
    .run();

  return ok({ id, url: `${requestUrl.origin}/s/${id}` }, h);
}

async function handleGet(id: string, env: Env, h: Record<string, string>): Promise<Response> {
  if (!ID_RE.test(id)) {
    return err(400, 'INVALID_ID', 'Invalid share ID format', h);
  }

  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    'SELECT payload FROM shared_scenarios WHERE id = ? AND expires_at > ?',
  )
    .bind(id, now)
    .first<{ payload: string }>();

  if (!row) {
    return err(404, 'NOT_FOUND', 'Share link not found or expired', h);
  }

  return ok({ payload: row.payload }, h);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const h = cors(origin, env.CORS_ORIGIN ?? '*');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: h });
    }

    const { pathname } = requestUrl;

    if (request.method === 'POST' && pathname === '/api/share') {
      return handleCreate(request, env, requestUrl, h);
    }

    const getMatch = pathname.match(/^\/api\/share\/([^/]+)$/);
    if (request.method === 'GET' && getMatch) {
      return handleGet(getMatch[1], env, h);
    }

    return err(404, 'NOT_FOUND', 'Not found', h);
  },
};
