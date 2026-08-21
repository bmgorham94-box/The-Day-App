// Dependency-free PNG icon generator for The Day.
// Draws the app's signature: a warm ground, a day-spine, and the clay "now" dot.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(outDir, { recursive: true });

// ── PNG encoder ──────────────────────────────────────────────────────────────
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ── Drawing ───────────────────────────────────────────────────────────────────
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Palette v2 ("printed program") — paper / ink field / rust now-dot / olive bars.
const PAPER = hex('#F7F4EE'), FOREST = hex('#26241F'), CLAY = hex('#B44A2C'), LINE = hex('#DDD7C8'), SAGE = hex('#5C5B3C');

function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const ia = a / 255, r0 = buf[i], g0 = buf[i + 1], b0 = buf[i + 2];
    buf[i] = r * ia + r0 * (1 - ia); buf[i + 1] = g * ia + g0 * (1 - ia);
    buf[i + 2] = b * ia + b0 * (1 - ia); buf[i + 3] = 255;
  };
  const fillRect = (x0, y0, w, h, c, a) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c, a); };
  const disc = (cx, cy, rad, c, a = 255) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad) set(x, y, c, a);
        else if (d <= rad + 1) set(x, y, c, a * (rad + 1 - d)); // AA edge
      }
  };
  const ring = (cx, cy, rad, thick, c) => {
    for (let y = Math.floor(cy - rad - thick); y <= cy + rad + thick; y++)
      for (let x = Math.floor(cx - rad - thick); x <= cx + rad + thick; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= rad && d <= rad + thick) set(x, y, c);
      }
  };

  // Ground: paper, with a rounded forest field (maskable keeps safe padding).
  fillRect(0, 0, size, size, PAPER);
  const inset = maskable ? Math.round(size * 0.12) : Math.round(size * 0.06);
  const fieldR = size - inset * 2;
  const radius = Math.round(fieldR * 0.22);
  // rounded-rect forest field
  for (let y = inset; y < inset + fieldR; y++) {
    for (let x = inset; x < inset + fieldR; x++) {
      const dx = Math.min(x - inset, inset + fieldR - 1 - x);
      const dy = Math.min(y - inset, inset + fieldR - 1 - y);
      if (dx < radius && dy < radius) {
        const d = Math.hypot(radius - dx, radius - dy);
        if (d <= radius) set(x, y, FOREST);
      } else set(x, y, FOREST);
    }
  }

  // Day-spine: vertical line down the field with node dots + the clay "now" dot.
  const cx = Math.round(size * 0.40);
  const top = inset + Math.round(fieldR * 0.18);
  const bot = inset + Math.round(fieldR * 0.82);
  fillRect(cx - Math.round(size * 0.012), top, Math.round(size * 0.024), bot - top, LINE, 200);
  const nodes = 4;
  for (let n = 0; n < nodes; n++) {
    const y = top + Math.round((bot - top) * (n / (nodes - 1)));
    if (n === 1) { // the "now" dot
      disc(cx, y, size * 0.07, CLAY);
      ring(cx, y, size * 0.085, Math.max(2, size * 0.016), CLAY);
    } else {
      disc(cx, y, size * 0.035, PAPER, 230);
    }
    // task bar to the right of each node
    fillRect(cx + Math.round(size * 0.06), y - Math.round(size * 0.018), Math.round(size * 0.30), Math.round(size * 0.036), n === 1 ? CLAY : SAGE, n === 1 ? 255 : 150);
  }

  return encodePNG(size, size, buf);
}

writeFileSync(join(outDir, 'icon-192.png'), draw(192));
writeFileSync(join(outDir, 'icon-512.png'), draw(512));
writeFileSync(join(outDir, 'maskable-512.png'), draw(512, { maskable: true }));
writeFileSync(join(outDir, 'apple-touch-180.png'), draw(180));
console.log('icons written to', outDir);
