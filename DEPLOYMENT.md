# Deployment Guide — KPR Calculator

## Environment Variables

This app is a fully client-side SPA. **No secrets are required.** Vite inlines
`VITE_*` variables at build time — they end up in the compiled JS bundle, visible
to anyone who downloads the page. Never store tokens or API keys here.

| Variable | Required | Description |
|---|---|---|
| `VITE_SENTRY_DSN` | No | Sentry DSN for error tracking (see Monitoring section) |
| `VITE_APP_VERSION` | No | Injected by CI (`${{ github.sha }}`), shown in error reports |

All variables are documented in `.env.production`. Copy `.env.example` to
`.env.local` for local overrides.

---

## Pre-Deployment Checklist

Run through this list before every production deployment.

### Code quality
- [ ] CI workflow (GitHub Actions → CI) is green on `master`
- [ ] `npm run build` completes without TypeScript errors or warnings
- [ ] `npm audit --audit-level=critical --omit=dev` reports 0 vulnerabilities

### Bundle review
- [ ] `dist/assets/vendor-react-*.js` is present (React vendor chunk — cached permanently)
- [ ] `dist/assets/exportService-*.js` is present and **not** loaded on initial page load
      (verify via browser DevTools → Network tab: it should appear only after "Unduh PDF")
- [ ] Total initial gzip payload (index.html + CSS + main JS + vendor-react) is under 220 kB

### Docker image
- [ ] `docker build -t kpr-calculator:latest .` succeeds with no errors
- [ ] `docker run --rm -p 8080:8080 kpr-calculator:latest` starts and `GET /health` returns `ok`
- [ ] `docker image inspect kpr-calculator:latest` shows the image runs as user `nginx` (non-root)
- [ ] Trivy scan (GitHub Actions → Docker → Security tab) shows no CRITICAL findings

### Runtime configuration
- [ ] `.env.production` has been reviewed — no secrets, no placeholder values accidentally shipped
- [ ] If `VITE_SENTRY_DSN` is set, a Sentry release has been created for this SHA

---

## Deployment Steps

### Option A — Docker on a VPS (recommended)

```bash
# 1. Pull the image built by CI
docker pull ghcr.io/vianbas/indonesia-kpr-calculator:latest

# 2. Stop the running container (if any)
docker stop kpr && docker rm kpr

# 3. Run the new container
docker run -d \
  --name kpr \
  -p 8080:8080 \
  --restart unless-stopped \
  ghcr.io/vianbas/indonesia-kpr-calculator:latest

# 4. Verify
curl -s http://localhost:8080/health   # → ok
```

Put Nginx or Caddy in front on port 443 to handle SSL (see SSL section below).

### Option B — Static hosting (Netlify / Vercel / Cloudflare Pages)

```bash
npm run build
# upload dist/ to your static hosting provider
```

These platforms handle SSL automatically. No Docker or nginx config needed.

---

## SSL / HTTPS Configuration

The Docker image serves HTTP on port 8080.  Place a reverse proxy in front that
terminates TLS and forwards to port 8080.

### Caddy (simplest — auto-renews Let's Encrypt)

```Caddyfile
kpr.yourdomain.com {
    reverse_proxy localhost:8080
}
```

### Nginx reverse proxy with Certbot

```nginx
server {
    listen 443 ssl;
    server_name kpr.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/kpr.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kpr.yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name kpr.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

```bash
certbot --nginx -d kpr.yourdomain.com
```

### Cloudflare (if using CDN)

Set SSL/TLS mode to **Full (strict)** in the Cloudflare dashboard.
Cloudflare terminates TLS at the edge; traffic from Cloudflare to your server
can remain HTTP on port 8080 if the server is private.

---

## Health Check

The app exposes `GET /health` via nginx which returns `200 ok`.

- **Docker HEALTHCHECK**: already configured — `docker ps` shows `(healthy)` after ~35 s
- **Load balancer**: point your ALB / nginx upstream health probe to `/health`
- **Uptime monitor**: use UptimeRobot or BetterStack to ping `https://yourdomain.com/health`
  every 5 minutes and alert on non-200 responses

---

## Monitoring & Error Tracking

### Sentry (recommended)

1. Create a project at [sentry.io](https://sentry.io) → React
2. Copy the DSN to `.env.production`:
   ```
   VITE_SENTRY_DSN=https://xxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX
   ```
3. Install the SDK:
   ```bash
   npm install @sentry/react
   ```
4. Initialize before rendering in `src/main.tsx`:
   ```ts
   import * as Sentry from '@sentry/react';

   if (import.meta.env.VITE_SENTRY_DSN) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       release: import.meta.env.VITE_APP_VERSION,
       environment: 'production',
       tracesSampleRate: 0.1,
     });
   }
   ```
5. The existing `<ErrorBoundary>` in `src/ui/components/common/ErrorBoundary.tsx` can be
   replaced with `<Sentry.ErrorBoundary>` to capture unhandled React errors.

### Uptime monitoring

UptimeRobot free tier:
- Monitor type: HTTPS
- URL: `https://yourdomain.com/health`
- Check interval: 5 minutes
- Alert: email / Slack webhook on down

---

## Rollback Strategy

Every push to `master` produces an immutable SHA-tagged image alongside `latest`.

```
ghcr.io/vianbas/indonesia-kpr-calculator:sha-abc1234   ← immutable, per-commit
ghcr.io/vianbas/indonesia-kpr-calculator:latest         ← always master HEAD
```

**To roll back to the previous release:**

```bash
# 1. Find the SHA of the last good commit
git log --oneline -10

# 2. Stop and remove the current container
docker stop kpr && docker rm kpr

# 3. Start the previous SHA image (already in GHCR — no rebuild needed)
docker run -d \
  --name kpr \
  -p 8080:8080 \
  --restart unless-stopped \
  ghcr.io/vianbas/indonesia-kpr-calculator:sha-<previous-sha>

# 4. Confirm health
curl -s http://localhost:8080/health   # → ok
```

Rollback takes ~10 seconds — the image is already pulled.

---

## Smoke Test — After Every Deployment

Run these checks in order immediately after `docker run` or after a static deploy.

| # | Check | Expected result |
|---|---|---|
| 1 | `GET /health` | `200 ok` |
| 2 | Open the app root URL in a browser | KPR Calculator loads without JS errors in the console |
| 3 | Enter a property price (e.g. 500,000,000) | "Nilai Kredit" field updates automatically |
| 4 | Enter DP 20%, tenor 20 years, fixed rate 7%, floating 11% | Summary card shows cicilan and total bunga amounts |
| 5 | Scroll to the amortization table | Table rows render with month, principal, interest, balance |
| 6 | Click "Unduh PDF" | Browser downloads a `.pdf` file; PDF opens correctly |
| 7 | Resize window to mobile width (375 px) | Layout is readable; no horizontal overflow |
| 8 | Reload the page with a path like `/anything` | App loads (not a 404) — SPA routing works |
| 9 | Check browser DevTools → Network | `exportService-*.js` chunk is **absent** on first load |
| 10 | Check browser DevTools → Network | `vendor-react-*.js` served with `Cache-Control: public, immutable` |
