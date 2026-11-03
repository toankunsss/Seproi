// Sharing: a picture card (1080x1350) with the logo, a headline, a snapshot of the office, a few
// numbers and the Google Play link, sent through the phone's share sheet (Capacitor Share +
// Filesystem) or, in a browser, the Web Share API / a PNG download.
//   report — end-of-day results          office — "my company" (More menu)
//   whip   — "the boss just whipped <friend's name>!" (staff screen: name staff after friends)
//   level  — campaign stars
import { native, plugin } from './platform.js';
import { drawLogo, drawTitle, titleSize } from './brand.js';
import { t } from './i18n.js';

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.whipboss.game';
const W = 1080, H = 1350;

const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

/**
 * Build the card. opts: { headline, sub, rows: [[label, value]], snapshot: canvas, images: [{ src, x, y, w, h }] }
 * Returns a canvas.
 */
export async function makeCard({ headline, sub = '', rows = [], snapshot = null, images = [] }) {
  try { await document.fonts.load('64px VT323'); } catch {}
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  // night-purple bands + stars
  ['#140f22', '#181128', '#1d142f', '#221836', '#271b3e'].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * 270, W, 270); });
  for (let i = 0; i < 70; i++) { x.fillStyle = i % 3 ? '#4a3a7a' : '#ffffff'; const sx = (i * 397) % W, sy = (i * 211) % H; x.fillRect(sx - (sx % 6), sy - (sy % 6), 6, 6); }
  // header: logo + lettering
  x.fillStyle = '#0f0c18'; x.fillRect(48, 44, 196, 196);
  x.fillStyle = '#ffd34d'; x.fillRect(54, 50, 184, 184);
  drawLogo(x, 60, 56, 172);
  const ts = titleSize(), u = Math.floor(720 / ts.w);
  drawTitle(x, 280, 142 - Math.round((ts.h * u) / 2) + 8, u);
  // headline
  x.textAlign = 'center';
  x.font = '86px VT323, monospace';
  x.fillStyle = '#0f0c18'; x.fillText(headline, W / 2 + 5, 345);
  x.fillStyle = '#ffd34d'; x.fillText(headline, W / 2, 340);
  if (sub) { x.font = '50px VT323, monospace'; x.fillStyle = '#e8deff'; x.fillText(sub, W / 2, 400); }
  // office snapshot
  let y = 440;
  if (snapshot) {
    const maxW = 860, maxH = rows.length ? 520 : 640;
    const k = Math.min(maxW / snapshot.width, maxH / snapshot.height);
    const sw = Math.round(snapshot.width * k), sh = Math.round(snapshot.height * k), sx = Math.round((W - sw) / 2);
    x.fillStyle = '#0f0c18'; x.fillRect(sx - 12, y - 12, sw + 24, sh + 24);
    x.fillStyle = '#ffd34d'; x.fillRect(sx - 6, y - 6, sw + 12, sh + 12);
    x.drawImage(snapshot, sx, y, sw, sh);
    y += sh + 40;
  }
  for (const im of images) { const img = await load(im.src); if (img) x.drawImage(img, im.x, im.y, im.w, im.h); }
  // numbers
  x.font = '52px VT323, monospace';
  for (const [label, value] of rows) {
    x.textAlign = 'left'; x.fillStyle = '#a99fc9'; x.fillText(label, 150, y + 36);
    x.textAlign = 'right'; x.fillStyle = '#ffffff'; x.fillText(value, W - 150, y + 36);
    y += 62;
  }
  // footer: call to action
  x.fillStyle = '#2f8a4a'; x.fillRect(140, H - 170, W - 280, 100);
  x.fillStyle = '#0f0c18'; x.fillRect(140, H - 76, W - 280, 6);
  x.textAlign = 'center'; x.font = '58px VT323, monospace'; x.fillStyle = '#ffffff';
  x.fillText(t('Chơi miễn phí trên Google Play'), W / 2, H - 103);
  return c;
}

/** Share a card canvas with a caption. Resolves 'shared' | 'downloaded' | 'cancelled'. */
export async function shareCard(canvas, caption) {
  const dataUrl = canvas.toDataURL('image/png');
  const text = `${caption} ${PLAY_URL}`;
  const FS = plugin('Filesystem'), SH = plugin('Share');
  if (native && FS && SH) {
    try {
      const r = await FS.writeFile({ path: `whipboss-${Date.now()}.png`, data: dataUrl.split(',')[1], directory: 'CACHE' });
      await SH.share({ title: 'Whip Boss', text, files: [r.uri], dialogTitle: t('Chia sẻ') });
      return 'shared';
    } catch (err) {
      return /cancel/i.test(String(err && err.message)) ? 'cancelled' : 'error';
    }
  }
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'whipboss.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return 'shared'; }
  } catch { return 'cancelled'; }
  const a = document.createElement('a');
  a.href = dataUrl; a.download = 'whipboss.png';
  document.body.appendChild(a); a.click(); a.remove();
  return 'downloaded';
}
