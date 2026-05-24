# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# Uses the LTS Node image to install dependencies and compile production assets.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker can cache the npm install layer.
# This layer is only invalidated when package.json or package-lock.json changes,
# not on every source code edit.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build.
COPY . .
RUN npm run build
# The compiled output is at /app/dist — no Node.js or source code is carried
# into the next stage.


# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
# The final image contains only Nginx + the compiled static assets.
# No Node.js, no source code, no devDependencies, no secrets.
FROM nginx:stable-alpine AS runner

# Create temp directories that Nginx needs for its internal buffers.
# /tmp is writable by any user, so the non-root nginx user can write here.
RUN mkdir -p \
      /tmp/nginx/client \
      /tmp/nginx/proxy \
      /tmp/nginx/fastcgi \
      /tmp/nginx/uwsgi \
      /tmp/nginx/scgi \
    && chown -R nginx:nginx /tmp/nginx \
    # Allow the nginx user to write logs and replace the default html root.
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html

# Copy compiled assets from the builder stage.
# --chown ensures the nginx user owns the files; no root access needed at runtime.
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Replace the default Nginx configuration with our SPA-aware config.
# The custom config omits the 'user' directive (required for non-root) and
# listens on port 8080 instead of the privileged port 80.
COPY nginx.conf /etc/nginx/nginx.conf

# Drop to the non-root nginx user for the rest of the container's lifetime.
USER nginx

# Document the port; matches the 'listen 8080' in nginx.conf.
EXPOSE 8080

# Lightweight liveness check — wget is bundled with busybox in alpine.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
