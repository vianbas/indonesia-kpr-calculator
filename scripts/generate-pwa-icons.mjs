// Generates PWA PNG icons with zero dependencies (Node's built-in zlib).
// Draws a white house glyph on the brand-blue background. Run: node scripts/generate-pwa-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(OUT, { recursive: true });

const BG = [29, 78, 216]; // #1d4ed8
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
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
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
  const c = 1 - a - b;
  return a >= 0 && b >= 0 && c >= 0;
}

function render(size, scale) {
  // `scale` shrinks the glyph toward the centre (for maskable safe-zone).
  const rgba = Buffer.alloc(size * size * 4);
  const C = size / 2;
  const u = (f) => C + (f - 0.5) * size * scale; // fraction(0..1) → pixel, scaled about centre
  // House geometry in fraction space
  const roof = { ax: u(0.5), ay: u(0.18), bx: u(0.82), by: u(0.46), cx: u(0.18), cy: u(0.46) };
  const body = { x0: u(0.28), x1: u(0.72), y0: u(0.44), y1: u(0.8) };
  const door = { x0: u(0.44), x1: u(0.56), y0: u(0.58), y1: u(0.8) };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let col = BG;
      const inBody = px >= body.x0 && px <= body.x1 && py >= body.y0 && py <= body.y1;
      const inRoof = inTriangle(px, py, roof.ax, roof.ay, roof.bx, roof.by, roof.cx, roof.cy);
      const inDoor = px >= door.x0 && px <= door.x1 && py >= door.y0 && py <= door.y1;
      if ((inBody || inRoof) && !inDoor) col = FG;
      const i = (y * size + x) * 4;
      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(size, rgba);
}

const targets = [
  ['icon-192.png', 192, 1.0],
  ['icon-512.png', 512, 1.0],
  ['icon-maskable-512.png', 512, 0.78], // safe zone for maskable
  ['apple-touch-icon.png', 180, 1.0],
];
for (const [name, size, scale] of targets) {
  writeFileSync(join(OUT, name), render(size, scale));
  console.log('wrote', name, size + 'px');
}
