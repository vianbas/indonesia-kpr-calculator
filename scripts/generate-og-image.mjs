// Generates public/og-image.png — a 1200×630 social-share card with the brand
// house glyph on the brand-blue background. Zero dependencies (Node zlib).
// Run: node scripts/generate-og-image.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const W = 1200;
const H = 630;
const BG = [29, 78, 216]; // #1d4ed8
const BG2 = [37, 99, 235]; // #2563eb — subtle vertical gradient end
const FG = [255, 255, 255];

// ── PNG encoder (truecolor+alpha, filter 0) ─────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ── Drawing ─────────────────────────────────────────────────────────────────
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
  return a >= 0 && b >= 0 && 1 - a - b >= 0;
}

// House glyph centred in a square box of side `box`, top-left at (ox, oy).
function houseHit(px, py, ox, oy, box) {
  const f = (fx, fy) => [ox + fx * box, oy + fy * box];
  const [rax, ray] = f(0.5, 0.18);
  const [rbx, rby] = f(0.82, 0.46);
  const [rcx, rcy] = f(0.18, 0.46);
  const bx0 = ox + 0.28 * box, bx1 = ox + 0.72 * box, by0 = oy + 0.44 * box, by1 = oy + 0.8 * box;
  const dx0 = ox + 0.44 * box, dx1 = ox + 0.56 * box, dy0 = oy + 0.58 * box, dy1 = oy + 0.8 * box;
  const inBody = px >= bx0 && px <= bx1 && py >= by0 && py <= by1;
  const inRoof = inTriangle(px, py, rax, ray, rbx, rby, rcx, rcy);
  const inDoor = px >= dx0 && px <= dx1 && py >= dy0 && py <= dy1;
  return (inBody || inRoof) && !inDoor;
}

const rgba = Buffer.alloc(W * H * 4);
const box = 360;
const ox = (W - box) / 2;
const oy = (H - box) / 2;

for (let y = 0; y < H; y++) {
  // vertical gradient BG → BG2
  const tg = y / H;
  const bg = [
    Math.round(BG[0] + (BG2[0] - BG[0]) * tg),
    Math.round(BG[1] + (BG2[1] - BG[1]) * tg),
    Math.round(BG[2] + (BG2[2] - BG[2]) * tg),
  ];
  for (let x = 0; x < W; x++) {
    const col = houseHit(x + 0.5, y + 0.5, ox, oy, box) ? FG : bg;
    const i = (y * W + x) * 4;
    rgba[i] = col[0];
    rgba[i + 1] = col[1];
    rgba[i + 2] = col[2];
    rgba[i + 3] = 255;
  }
}

writeFileSync(join(OUT, 'og-image.png'), encodePNG(W, H, rgba));
console.log('wrote og-image.png', `${W}x${H}`);
