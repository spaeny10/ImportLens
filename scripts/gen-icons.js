// Generates the PWA icon set as PNGs with no image-library dependency:
// draws the "lens over data bars" mark into an RGBA buffer (2x supersampled)
// and encodes PNG manually (zlib is built into Node).
//
// Usage: node scripts/gen-icons.js   -> writes public/icons/*.png
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- drawing
const BG = [11, 18, 32]; // #0b1220
const RING = [56, 189, 248]; // sky-400
const BARS = [125, 211, 252]; // sky-300

function dist(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy);
}
// distance from point to segment
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Sample the icon at unit coords (0..1); returns [r,g,b,a].
// maskable: full-bleed background, content shrunk into the 80% safe zone.
function sample(u, v, maskable) {
  const S = 512;
  const x = u * S, y = v * S;

  // background: rounded rect (r=110) or full bleed for maskable
  let inBg = true;
  if (!maskable) {
    const r = 110;
    const qx = Math.max(Math.abs(x - 256) - (256 - r), 0);
    const qy = Math.max(Math.abs(y - 256) - (256 - r), 0);
    inBg = Math.hypot(qx, qy) <= r;
  }
  if (!inBg) return [0, 0, 0, 0];

  // content transform: shrink for maskable safe zone
  const k = maskable ? 0.8 : 1;
  const cx = 256 + (x - 256) / k;
  const cy = 256 + (y - 256) / k;

  // lens ring: center (236,236) radius 150, stroke 38
  const ringC = [236, 236], ringR = 150, ringW = 19;
  const dRing = Math.abs(dist(cx, cy, ringC[0], ringC[1]) - ringR);
  if (dRing <= ringW) return [...RING, 255];

  // handle: capsule from ring edge at 45° to corner
  const hx0 = ringC[0] + (ringR + ringW - 6) * Math.SQRT1_2;
  const hy0 = ringC[1] + (ringR + ringW - 6) * Math.SQRT1_2;
  const hx1 = 418, hy1 = 418;
  if (segDist(cx, cy, hx0, hy0, hx1, hy1) <= 26) return [...RING, 255];

  // data bars inside the lens (left-aligned, varying width)
  const inLens = dist(cx, cy, ringC[0], ringC[1]) < ringR - ringW - 14;
  if (inLens) {
    const bars = [
      { y: 176, w: 150 },
      { y: 236, w: 110 },
      { y: 296, w: 170 },
    ];
    for (const b of bars) {
      const bx0 = 156, bx1 = 156 + b.w, half = 17;
      if (cy >= b.y - half && cy <= b.y + half) {
        // rounded ends
        if (cx >= bx0 && cx <= bx1) return [...BARS, 255];
        if (dist(cx, cy, bx0, b.y) <= half || dist(cx, cy, bx1, b.y) <= half) return [...BARS, 255];
      }
    }
  }
  return [...BG, 255];
}

function render(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 2; // supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb, pa] = sample(
            (x + (sx + 0.5) / SS) / size,
            (y + (sy + 0.5) / SS) / size,
            maskable
          );
          r += pr; g += pg; b += pb; a += pa;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = r / n; rgba[i + 1] = g / n; rgba[i + 2] = b / n; rgba[i + 3] = a / n;
    }
  }
  return encodePng(size, size, rgba);
}

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
const files = [
  ["icon-192.png", render(192, false)],
  ["icon-512.png", render(512, false)],
  ["icon-maskable-512.png", render(512, true)],
  ["apple-touch-icon.png", render(180, true)],
];
for (const [name, buf] of files) {
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`wrote public/icons/${name} (${buf.length} bytes)`);
}
