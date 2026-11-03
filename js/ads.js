// Rewarded ads. The game only calls showRewarded(placement) and gives the reward when it
// resolves to true. Providers:
//   - AdMob (native app with @capacitor-community/admob installed): see docs/QUANG-CAO.md
//   - simulated: a 5-second fake ad overlay, used until AdMob is set up (and in the browser)
import { native } from './platform.js';

// Fill these in from your AdMob account (docs/QUANG-CAO.md). The values below are Google's
// public TEST unit ids: they always serve test ads and are safe while developing.
export const AD_UNITS = {
  android: { rewarded: 'ca-app-pub-3940256099942544/5224354917' },
  ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313' },
};

const admob = () => (native && window.Capacitor && window.Capacitor.isPluginAvailable('AdMob')
  ? window.Capacitor.registerPlugin('AdMob') : null);

let busy = false;

/** Show a rewarded ad. Resolves true only if the player watched it to the end. */
export async function showRewarded(placement = '') {
  if (busy) return false;
  busy = true;
  try {
    const plugin = admob();
    return plugin ? await showAdMob(plugin) : await showSimulated(placement);
  } catch (err) {
    console.warn('[ads] rewarded failed', err);
    return false;
  } finally {
    busy = false;
  }
}

let admobReady = null;
async function showAdMob(AdMob) {
  if (!admobReady) admobReady = AdMob.initialize({});
  await admobReady;
  const platform = window.Capacitor.getPlatform();
  const adId = (AD_UNITS[platform] || AD_UNITS.android).rewarded;
  await AdMob.prepareRewardVideoAd({ adId });
  const reward = await AdMob.showRewardVideoAd();
  return !!reward;
}

/** Stand-in ad so the reward loop can be played and tested before AdMob is configured. */
function showSimulated(placement) {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'fake-ad';
    el.innerHTML = `<div class="fake-ad-box">
      <small>QUẢNG CÁO (GIẢ LẬP)</small>
      <div class="fake-ad-title">Trà sữa Mây</div>
      <p>Uống là tỉnh, làm là xong deadline!</p>
      <div class="fake-ad-bar"><i></i></div>
      <button class="px-btn" data-skip>Đóng (không nhận thưởng)</button>
      <button class="px-btn big" data-claim hidden>Nhận thưởng</button>
    </div>`;
    document.body.appendChild(el);
    el.dataset.placement = placement;
    const bar = el.querySelector('.fake-ad-bar i');
    const claim = el.querySelector('[data-claim]');
    let t = 0;
    const tick = setInterval(() => {
      t += 0.1;
      bar.style.width = Math.min(100, (t / 5) * 100) + '%';
      if (t >= 5) { clearInterval(tick); claim.hidden = false; }
    }, 100);
    const finish = (ok) => { clearInterval(tick); el.remove(); done(ok); };
    el.querySelector('[data-skip]').addEventListener('click', () => finish(false));
    claim.addEventListener('click', () => finish(true));
  });
}
