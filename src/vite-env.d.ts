/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string | undefined;
  readonly VITE_APP_ENV: string | undefined;
  readonly VITE_APP_VERSION: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
