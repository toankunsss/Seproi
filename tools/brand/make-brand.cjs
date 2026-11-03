// Generates every image of the game's brand from ONE source: drawLogo() in js/brand.js
// (pixel art on a 32x32 grid). No design files or canvas library needed: drawLogo only
// uses fillRect, so a tiny fake 2D context rasterises it straight into an RGBA buffer.
//
//   icon.svg, docs/icon.svg          favicon (web / desktop) + privacy policy page
//   desktop/build/icon.ico, icon.png Windows / macOS app icon
//   mobile/assets/*.png              sources for `capacitor-assets generate` (Android + iOS)
//   tools/brand/out/icon-512.png     Google Play store icon (512x512, gitignored)
//   tools/brand/out/feature-1024x500.png  Google Play feature graphic (gitignored)
//
// Run: node tools/brand/make-brand.cjs   (mobile: `npm run icons` also runs capacitor-assets)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..');
const BG = '#1a1626'; // app background (splash, adaptive icon background)

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]; };

/** Fake CanvasRenderingContext2D that records/rasterises fillRect calls. */
function makeCtx(w, h, bg) {
  const buf = Buffer.alloc(w * h * 4);
  if (bg) { const c = hex(bg); for (let i = 0; i < w * h; i++) buf.set(c, i * 4); }
  const rects = [];
  const ctx = {
    fillStyle: '#000', imageSmoothingEnabled: false, save() {}, restore() {},
    fillRect(x, y, rw, rh) {
      rects.push([x, y, rw, rh, this.fillStyle]);
      const c = hex(this.fillStyle);
      for (let j = Math.max(0, y); j < Math.min(h, y + rh); j++) for (let i = Math.max(0, x); i < Math.min(w, x + rw); i++) buf.set(c, (j * w + i) * 4);
    },
  };
  return { ctx, buf, rects };
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function ico(images) { // [{ size, data: png buffer }]
  const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const dir = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...images.map((i) => i.data)]);
}

function write(rel, data) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log('  ' + rel);
}

(async () => {
  const { drawLogo, drawTitle, titleSize } = await import(path.join(ROOT, 'js', 'brand.js'));
  /** Logo of `logo` px centred on a `size` canvas (bg null = transparent). */
  const render = (size, logo = size, { bg = null, background = true, figure = true, at } = {}) => {
    const { ctx, buf } = makeCtx(size, size, bg);
    const off = Math.floor((size - logo) / 2);
    drawLogo(ctx, at ? at[0] : off, at ? at[1] : off, logo, { background, figure });
    return png(size, size, buf);
  };

  console.log('Brand images:');
  // favicon: one <rect> per fillRect on the 32-unit grid
  {
    const { ctx, rects } = makeCtx(32, 32, null);
    drawLogo(ctx, 0, 0, 32);
    const body = rects.map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${body}</svg>\n`;
    write('icon.svg', svg);
    write('docs/icon.svg', svg); // privacy policy page (GitHub Pages serves docs/)
  }
  // desktop
  write('desktop/build/icon.ico', ico([16, 32, 48, 64, 128, 256].map((s) => ({ size: s, data: render(s) }))));
  write('desktop/build/icon.png', render(512));
  // mobile (@capacitor/assets sources)
  write('mobile/assets/icon-only.png', render(1024));
  write('mobile/assets/icon-foreground.png', render(1024, 900, { background: false, at: [62, 124] }));
  // ^ adaptive icon: the Android project wraps this layer in a 16.7% inset, so the whole image is
  //   what shows inside the launcher's mask. The boss sits low so his shoulders run off the
  //   bottom of a round mask instead of floating, and the whip tip stays inside the circle.
  write('mobile/assets/icon-background.png', render(1024, 1024, { figure: false })); // backdrop only
  write('mobile/assets/splash.png', render(2732, 640, { bg: BG }));
  write('mobile/assets/splash-dark.png', render(2732, 640, { bg: BG }));
  // store
  write('tools/brand/out/icon-512.png', render(512));
  {
    // feature graphic: night-purple banner, logo on the left, "WHIP BOSS" lettering on the right
    const W = 1024, H = 500;
    const { ctx, buf } = makeCtx(W, H, '#1a1626');
    const band = (y, h, c) => { ctx.fillStyle = c; ctx.fillRect(0, y, W, h); };
    ['#1d1530', '#21183a', '#261c44', '#2b204e'].forEach((c, i) => band(i * 125, 125, c));
    for (let i = 0; i < 70; i++) { // stars
      const x = Math.floor((Math.sin(i * 91.7) * 0.5 + 0.5) * W), y = Math.floor((Math.sin(i * 37.3 + 1) * 0.5 + 0.5) * H);
      ctx.fillStyle = i % 3 ? '#6c5a9a' : '#ffffff'; ctx.fillRect(x - (x % 4), y - (y % 4), 4, 4);
    }
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(54, 54, 392, 392);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(62, 62, 376, 376);
    drawLogo(ctx, 70, 70, 360);
    // two lines; the leading space in ' BOSS' makes it the second (red) word, so shift it back 3 units
    const u = 17, cx = 480 + (W - 480 - 20) / 2, a = titleSize('WHIP'), b = titleSize('BOSS');
    const y0 = Math.floor((H - (a.h + b.h + 1) * u) / 2);
    drawTitle(ctx, Math.floor(cx - (a.w * u) / 2), y0, u, 'WHIP');
    drawTitle(ctx, Math.floor(cx - (b.w * u) / 2) - 3 * u, y0 + (a.h + 1) * u, u, ' BOSS');
    write('tools/brand/out/feature-1024x500.png', png(W, H, buf));
  }
})();
