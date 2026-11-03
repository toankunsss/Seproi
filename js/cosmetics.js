// Collections: whip skins and office pets (bought with 💎) and the staff album.
//
//   g.cos   = { skins: [ids], skin: id|null, pets: [ids], pet: id|null }
//   g.album = { got: [character ids], claimed: [set ids], all: bool }
// Album characters (config ALBUM) turn up as applicants (cv.js); hiring one adds their card.
import { WHIP_SKINS, PETS, ALBUM, ALBUM_SETS, ALBUM_REWARD } from './config.js';
import { addGems } from './achievements.js';

export function cosState(g) {
  if (!g.cos) g.cos = { skins: [], skin: null, pets: [], pet: null };
  return g.cos;
}
export function albumState(g) {
  if (!g.album) g.album = { got: [], claimed: [], all: false };
  return g.album;
}

/** Active whip skin (WHIP_SKINS entry) or null. */
export const skinOf = (g) => (g.cos && g.cos.skin && WHIP_SKINS.find((s) => s.id === g.cos.skin)) || null;
export const petOf = (g) => (g.cos && g.cos.pet) || null;

/** Buy (if needed) and use a skin / pet. Returns '' on success or a reason. */
export function useSkin(g, id) {
  const c = cosState(g);
  if (id === null) { c.skin = null; return ''; }
  const s = WHIP_SKINS.find((x) => x.id === id);
  if (!s) return 'x';
  if (!c.skins.includes(id)) {
    if (g.gems < s.gems) return 'gems';
    g.gems -= s.gems; c.skins.push(id);
  }
  c.skin = id;
  return '';
}
export function usePet(g, id) {
  const c = cosState(g);
  if (id === null) { c.pet = null; return ''; }
  const p = PETS.find((x) => x.id === id);
  if (!p) return 'x';
  if (!c.pets.includes(id)) {
    if (g.gems < p.gems) return 'gems';
    g.gems -= p.gems; c.pets.push(id);
  }
  c.pet = id;
  return '';
}

// --- album ---------------------------------------------------------------------------------------
export const hasCard = (g, id) => !!g.album && g.album.got.includes(id);
export function addCard(g, id) {
  const a = albumState(g);
  if (a.got.includes(id)) return false;
  a.got.push(id);
  return true;
}
export const setCards = (setId) => ALBUM.filter((c) => c.set === setId);
export const setDone = (g, setId) => setCards(setId).every((c) => hasCard(g, c.id));

/** Claim a finished set (or 'all' for the whole album). Returns 💎 given (0 if not allowed). */
export function claimSet(g, setId) {
  const a = albumState(g);
  if (setId === 'all') {
    if (a.all || a.got.length < ALBUM.length) return 0;
    a.all = true; addGems(g, ALBUM_REWARD.allGems); return ALBUM_REWARD.allGems;
  }
  if (a.claimed.includes(setId) || !setDone(g, setId)) return 0;
  a.claimed.push(setId); addGems(g, ALBUM_REWARD.setGems);
  return ALBUM_REWARD.setGems;
}
export const albumClaimable = (g) => ALBUM_SETS.filter((s) => !(g.album && g.album.claimed.includes(s.id)) && setDone(g, s.id)).length
  + (g.album && !g.album.all && g.album.got.length >= ALBUM.length ? 1 : 0);

/** An album character not collected yet (or any if all are), for the CV generator. */
export function pickCharacter(g) {
  const missing = ALBUM.filter((c) => !hasCard(g, c.id));
  const pool = missing.length ? missing : ALBUM;
  return pool[Math.floor(Math.random() * pool.length)];
}
