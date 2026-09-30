// Generates build/icon.ico (+ icon.png) from the 16x16 pixel whip, scaled up crisply.
// Run: node build/make-icon.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 16;
const px = Array.from({ length: S * S }, () => [26, 22, 38, 255]); // #1a1626 background
const fill = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px[j * S + i] = [...c, 255]; };
fill(2, 11, 3, 3, [122, 74, 42]);
fill(4, 10, 2, 2, [154, 96, 52]);
fill(6, 8, 2, 2, [192, 122, 60]);
fill(8, 5, 2, 3, [192, 122, 60]);
fill(10, 3, 2, 2, [224, 160, 80]);
fill(12, 2, 2, 2, [255, 211, 77]);
fill(13, 4, 1, 1, [255, 255, 255]);

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size) {
  const k = size / S;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const p = px[Math.floor(y / k) * S + Math.floor(x / k)];
      p.forEach((v, i) => (raw[y * (size * 4 + 1) + 1 + x * 4 + i] = v));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const sizes = [16, 32, 48, 64, 128, 256];
const imgs = sizes.map(png);
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(imgs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += imgs[i].length;
  return e;
});
fs.writeFileSync(path.join(__dirname, 'icon.ico'), Buffer.concat([header, ...dir, ...imgs]));
fs.writeFileSync(path.join(__dirname, 'icon.png'), png(512));
console.log('icon.ico + 512px icon.png written');
