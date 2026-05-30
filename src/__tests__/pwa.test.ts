import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf-8')) as {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  theme_color: string;
  icons: ManifestIcon[];
};

describe('PWA assets', () => {
  it('manifest has the required installability fields', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1d4ed8');
  });

  it('declares 192 + 512 icons and a maskable icon', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('all referenced icon files exist on disk', () => {
    for (const icon of manifest.icons) {
      expect(existsSync('public' + icon.src), `${icon.src} should exist`).toBe(true);
    }
    expect(existsSync('public/apple-touch-icon.png')).toBe(true);
  });

  it('ships a service worker with a fetch handler', () => {
    expect(existsSync('public/sw.js')).toBe(true);
    expect(readFileSync('public/sw.js', 'utf-8')).toContain("addEventListener('fetch'");
  });
});
