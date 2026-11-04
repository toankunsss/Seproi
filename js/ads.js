// Ads.
//   showRewarded(placement)  — the player chooses to watch; the reward is given when it resolves true.
//   showInterstitial()       — a full-screen ad shown by the game itself at a natural break (between
//                              days, after a level), at most a few times a day; see main.js → maybeInterstitial
//                              and ADS.interstitial in config.js for the pacing rules.
// Providers:
//   - AdMob (native app, @capacitor-community/admob): see docs/QUANG-CAO.md
//   - simulated: a 5-second fake ad overlay, used in the browser / desktop (no AdMob there)
//
// Debug builds (the test APK) always request Google's TEST ads; only the store release uses the
// real ad unit below. Never tap your own live ads: AdMob bans accounts for invalid clicks.
import { native } from './platform.js';
import { t } from './i18n.js';

export const AD_UNITS = {
  android: {
    rewarded: 'ca-app-pub-2932189263098274/9932749113', // Whip Boss · reward_main
    // TODO: create an "Interstitial" ad unit in AdMob and put its id here. Until then Google's
    // public test unit is used, which shows test ads and earns nothing.
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  // iOS: no AdMob iOS app yet → Google's public test units (replace before an App Store release)
  ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
};
const unit = (kind) => (AD_UNITS[cap().getPlatform()] || AD_UNITS.android)[kind];
/** True when real ads can be shown (the phone app with AdMob). */
export const adsAvailable = () => !!admob();

const cap = () => window.Capacitor;
const proxies = {};
function getPlugin(name) {
  if (!native || !cap() || !cap().registerPlugin) return null;
  if (!(name in proxies)) proxies[name] = cap().isPluginAvailable(name) ? cap().registerPlugin(name) : null;
  return proxies[name];
}
const admob = () => getPlugin('AdMob');

/** Why the last showRewarded() returned false: 'closed' (skipped), 'unavailable' (no ad), ''. */
export let lastAdFailure = '';

let busy = false;

/** Show a rewarded ad. Resolves true only if the player watched it to the end. */
export async function showRewarded(placement = '') {
  if (busy) return false;
  busy = true;
  lastAdFailure = '';
  try {
    const plugin = admob();
    return plugin ? await showAdMob(plugin) : await showSimulated(placement);
  } catch (err) {
    console.warn('[ads] rewarded failed', err);
    lastAdFailure = 'unavailable';
    return false;
  } finally {
    busy = false;
  }
}

// --- AdMob ---------------------------------------------------------------------------------
let ready = null;     // initialize + consent, once
let testing = true;   // test ads unless this is a release build
let prepared = null;  // the next rewarded ad, loading in the background

/** Start AdMob early (app launch): consent form for EEA/UK users, then preload an ad. */
export function initAds() {
  const AdMob = admob();
  if (!AdMob || ready) return ready;
  ready = (async () => {
    try {
      const info = await getPlugin('BuildInfo')?.get();
      testing = !info || info.debug !== false;
    } catch { testing = true; }
    try {
      // Google's UMP consent: shows a form only where the law requires it (EEA, UK, Switzerland).
      const consent = await AdMob.requestConsentInfo();
      if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) await AdMob.showConsentForm();
    } catch (err) { console.warn('[ads] consent', err); }
    await AdMob.initialize({});
    prepare(AdMob);
    prepareInter(AdMob);
  })().catch((err) => { console.warn('[ads] init', err); ready = null; });
  return ready;
}

function prepare(AdMob) {
  const adId = unit('rewarded');
  prepared = AdMob.prepareRewardVideoAd({ adId, isTesting: testing });
  prepared.catch(() => { prepared = null; });
  return prepared;
}

async function showAdMob(AdMob) {
  await initAds();
  try {
    await (prepared || prepare(AdMob));
  } catch {
    try { await prepare(AdMob); } catch { lastAdFailure = 'unavailable'; prepared = null; return false; }
  }
  // showRewardVideoAd() only resolves when the reward is earned (it never settles if the player
  // closes early), so the outcome comes from the Rewarded / Dismissed events.
  const handles = [];
  const result = await new Promise((resolve) => {
    let rewarded = false, settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    const listen = async (event, fn) => handles.push(await AdMob.addListener(event, fn));
    Promise.all([
      listen('onRewardedVideoAdReward', () => { rewarded = true; }),
      // the reward callback can land just after the dismiss on some devices: wait a moment
      listen('onRewardedVideoAdDismissed', () => setTimeout(() => done(rewarded), 400)),
      listen('onRewardedVideoAdFailedToShow', () => { lastAdFailure = 'unavailable'; done(false); }),
    ]).then(() => {
      AdMob.showRewardVideoAd().then(() => { rewarded = true; }).catch(() => { lastAdFailure = 'unavailable'; done(false); });
    });
  });
  handles.forEach((h) => h.remove());
  if (!result && !lastAdFailure) lastAdFailure = 'closed';
  prepared = null;
  prepare(AdMob); // load the next one in the background
  return result;
}

// --- Interstitial (AdMob only) ---------------------------------------------------------------
let interPrepared = null;
function prepareInter(AdMob) {
  interPrepared = AdMob.prepareInterstitial({ adId: unit('interstitial'), isTesting: testing });
  interPrepared.catch(() => { interPrepared = null; });
  return interPrepared;
}

/**
 * Show an interstitial now if one is loaded. Resolves when it is closed: true = shown.
 * Never waits for a slow load: if nothing is ready the game just carries on (and one loads for next time).
 * Outside the phone app (browser tests) `simulate` shows a 3-second stand-in.
 */
export async function showInterstitial({ simulate = false } = {}) {
  const AdMob = admob();
  if (!AdMob) return simulate ? showSimulatedInter() : false;
  if (busy) return false;
  await initAds();
  const ok = interPrepared && await Promise.race([interPrepared.then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 300))]);
  if (!ok) { if (!interPrepared) prepareInter(AdMob); return false; }
  busy = true;
  const handles = [];
  try {
    return await new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      const listen = async (event, fn) => handles.push(await AdMob.addListener(event, fn));
      Promise.all([
        listen('interstitialAdDismissed', () => done(true)),
        listen('interstitialAdFailedToShow', () => done(false)),
      ]).then(() => AdMob.showInterstitial().catch(() => done(false)));
      setTimeout(() => done(true), 120000); // safety net: never leave the game paused forever
    });
  } finally {
    handles.forEach((h) => h.remove());
    busy = false;
    interPrepared = null;
    prepareInter(AdMob);
  }
}

function showSimulatedInter() {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'fake-ad inter';
    el.innerHTML = `<div class="fake-ad-box">
      <small>${t('QUẢNG CÁO (GIẢ LẬP)')}</small>
      <div class="fake-ad-title">Trà sữa Mây</div>
      <p>${t('Uống là tỉnh, làm là xong deadline!')}</p>
      <button class="px-btn" data-close disabled>3</button>
    </div>`;
    document.body.appendChild(el);
    const btn = el.querySelector('[data-close]');
    let n = 3;
    const tick = setInterval(() => { n--; if (n > 0) btn.textContent = String(n); else { clearInterval(tick); btn.disabled = false; btn.textContent = '×'; } }, 1000);
    btn.addEventListener('click', () => { clearInterval(tick); el.remove(); done(true); });
  });
}

// --- Simulated ad (browser / desktop) ---------------------------------------------------------
/** Stand-in ad so the reward loop can be played and tested without AdMob. */
function showSimulated(placement) {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'fake-ad';
    el.innerHTML = `<div class="fake-ad-box">
      <small>${t('QUẢNG CÁO (GIẢ LẬP)')}</small>
      <div class="fake-ad-title">Trà sữa Mây</div>
      <p>${t('Uống là tỉnh, làm là xong deadline!')}</p>
      <div class="fake-ad-bar"><i></i></div>
      <button class="px-btn" data-skip>${t('Đóng (không nhận thưởng)')}</button>
      <button class="px-btn big" data-claim hidden>${t('Nhận thưởng')}</button>
    </div>`;
    document.body.appendChild(el);
    el.dataset.placement = placement;
    const bar = el.querySelector('.fake-ad-bar i');
    const claim = el.querySelector('[data-claim]');
    let elapsed = 0;
    const tick = setInterval(() => {
      elapsed += 0.1;
      bar.style.width = Math.min(100, (elapsed / 5) * 100) + '%';
      if (elapsed >= 5) { clearInterval(tick); claim.hidden = false; }
    }, 100);
    const finish = (ok) => { clearInterval(tick); el.remove(); if (!ok) lastAdFailure = 'closed'; done(ok); };
    el.querySelector('[data-skip]').addEventListener('click', () => finish(false));
    claim.addEventListener('click', () => finish(true));
  });
}
