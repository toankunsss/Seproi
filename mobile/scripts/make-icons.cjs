// Generates every app icon / splash source from the 16x16 pixel whip (same art as icon.svg
// and desktop/build/make-icon.cjs), so the repo needs no binary design files.
//
//   assets/*.png          sources for `capacitor-assets generate` (Android + iOS icons/splash)
//
// Run: npm run icons   (this script, then @capacitor/assets writes the native resources)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [26, 22, 38, 255]; // #1a1626
const ART = [
  [2, 11, 3, 3, [122, 74, 42]],
  [4, 10, 2, 2, [154, 96, 52]],
  [6, 8, 2, 2, [192, 122, 60]],
  [8, 5, 2, 3, [192, 122, 60]],
  [10, 3, 2, 2, [224, 160, 80]],
  [12, 2, 2, 2, [255, 211, 77]],
  [13, 4, 1, 1, [255, 255, 255]],
];

/** RGBA buffer: `size` square, background `bg` (null = transparent), art occupying `artFrac`. */
function render(size, { bg = BG, artFrac = 1 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  if (bg) for (let i = 0; i < size * size; i++) buf.set(bg, i * 4);
  const cell = Math.floor((size * artFrac) / 16);
  const off = Math.floor((size - cell * 16) / 2);
  for (const [x, y, w, h, c] of ART) {
    for (let j = y * cell; j < (y + h) * cell; j++) {
      for (let i = x * cell; i < (x + w) * cell; i++) buf.set([...c, 255], ((off + j) * size + off + i) * 4);
    }
  }
  return buf;
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(file, size, opts) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png(size, render(size, opts)));
  console.log('  ' + path.relative(process.cwd(), file));
}

const assets = path.join(__dirname, '..', 'assets');
console.log('Writing icons:');
write(path.join(assets, 'icon-only.png'), 1024, { artFrac: 0.8 });
write(path.join(assets, 'icon-foreground.png'), 1024, { bg: null, artFrac: 0.56 }); // adaptive icon safe zone
write(path.join(assets, 'icon-background.png'), 1024, { artFrac: 0 });
write(path.join(assets, 'splash.png'), 2732, { artFrac: 0.2 });
write(path.join(assets, 'splash-dark.png'), 2732, { artFrac: 0.2 });
