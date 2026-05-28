# Backend Short Links — Cloudflare Workers + D1

Short share links (`/s/kpr_XXXXXXXX`) are served by a Cloudflare Worker that stores scenario payloads in a D1 SQLite database. The existing `?s=` query-param URL remains fully supported as a fallback.

## Architecture

```
Browser  →  POST /api/share  →  Cloudflare Worker  →  D1 (INSERT)
                                                    ←  { id, url }

/s/kpr_XXXXXXXX  →  Cloudflare Pages (_redirects: /s/* → /index.html 200)
                 →  React SPA (useShortLinkInit hook)
                 →  GET /api/share/:id  →  Worker  →  D1 (SELECT)
                                                   ←  { payload }
                 →  decodeUrlState(payload)  →  CalculatorPage
```

## File layout

```
workers/share-api/
├── migrations/
│   └── 0001_shared_scenarios.sql   # D1 schema
├── src/
│   ├── index.ts                    # Worker entrypoint (CORS, routing, rate limit)
│   └── utils.ts                    # Pure helpers (generateId, hashIp, errBody)
├── .dev.vars.example               # Local secrets template
├── package.json
├── tsconfig.json
└── wrangler.toml.example           # Deployment config template

src/
├── utils/shortLinkApi.ts           # createShortLink / fetchShortLinkPayload
└── hooks/useShortLinkInit.ts       # /s/:id route init hook

public/_redirects                   # Cloudflare Pages SPA rewrite rule
```

## Setup

### 1 — Create the D1 database

```bash
npx wrangler d1 create kpr-shares
# Copy the database_id from the output into wrangler.toml
```

### 2 — Configure the Worker

```bash
cp workers/share-api/wrangler.toml.example workers/share-api/wrangler.toml
# Edit wrangler.toml: set database_id and CORS_ORIGIN
```

### 3 — Add secrets

```bash
cd workers/share-api
npx wrangler secret put IP_HASH_SECRET   # any random string
# Optional:
npx wrangler secret put TURNSTILE_SECRET # from Cloudflare Turnstile dashboard
```

### 4 — Run migrations

```bash
npm run worker:migrate:local   # local dev
npm run worker:migrate:prod    # production
```

### 5 — Set the frontend env var

Add to `.env.local` (or Cloudflare Pages environment variables):
```
VITE_SHARE_API_URL=https://kpr-share-api.<your-account>.workers.dev
```

Leave empty to disable short links — the app falls back to `?s=` URLs automatically.

## Local development

```bash
cp workers/share-api/.dev.vars.example workers/share-api/.dev.vars
npm run worker:dev         # starts Worker on http://localhost:8787
npm run dev                # starts Vite dev server
```

Set `VITE_SHARE_API_URL=http://localhost:8787` in `.env.local` to test end-to-end locally.

## Deployment

```bash
npm run worker:deploy
```

## Security controls

| Control | Detail |
|---|---|
| Payload size | Max `MAX_PAYLOAD_BYTES` (default 10 KB, hard cap 64 KB) |
| Rate limiting | Max `RATE_LIMIT_PER_MINUTE` (default 10) creates/IP/minute via D1 |
| IP privacy | Raw IP is never stored; HMAC-SHA256 of IP (16-char hex) is stored |
| Turnstile | Optional; enabled when `TURNSTILE_SECRET` is set |
| CORS | Requests only accepted from `CORS_ORIGIN` |
| Expiry | Links expire after `SHARE_EXPIRY_DAYS` (default 90 days) |
| ID format | `kpr_` + 8 base62 chars (~47 bits entropy); validated on read |

## Fallback behavior

If `VITE_SHARE_API_URL` is empty, or if the `POST /api/share` call fails for any reason, the share modal silently falls back to the original `?s=` query-param URL. No user action required.

Old `?s=` URLs continue to work — `parseUrlInit()` reads them and `decodeUrlState()` handles both LZString (v2) and legacy base64 (v1).
