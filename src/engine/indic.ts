// Indic syllable engine — a modern port of the legacy src/Indic.ts.
//
// Core idea (unchanged from the original): a board cell holds ONE syllable
// (aksharam). A syllable is stored as a list of "items" — base letters, or a
// dependent vowel sign / virama once combined. Adding a tile to a cell:
//   1. try the tile as-is          (క + ష  -> క్ష, via virama insertion)
//   2. else try its synonym sign   (క + ఆ  -> కా, ఆ becomes ా)
// and the combination is accepted only if IsValid() passes — exactly the
// fallback the legacy GameActions.ToBoardInternal implemented.
import {
  CONSONANTS, FULL_SPECIAL_SET, SPECIAL_SET, SUNNA_SET, SYNONYMS,
  SYLLABLE_CHARS, SYLLABLE_TILES, VOWELS, VIRAMA_TILE,
} from './te-config';

const CONSONANT_SET = new Set(CONSONANTS);
const VOWEL_SET = new Set(VOWELS);
const SPECIAL = new Set(SPECIAL_SET);
const FULL_SPECIAL = new Set(FULL_SPECIAL_SET);
const SUNNA = new Set(SUNNA_SET);
const ZWNJ = '\u200C';

export const isConsonant = (c: string) => CONSONANT_SET.has(c);
export const isVowel = (c: string) => VOWEL_SET.has(c);
export const isSunna = (c: string) => SUNNA.has(c);
export const getSynonym = (c: string): string | undefined => SYNONYMS[c];

/** Expand one stored cell item to its glyph-building characters. */
export function itemToChars(item: string): string[] {
  if (SYLLABLE_CHARS[item]) return [...SYLLABLE_CHARS[item]];
  if (item === VIRAMA_TILE) return ['్'];
  return Array.from(item).filter((c) => c !== ZWNJ);
}

export function itemsToChars(items: string[]): string[] {
  return items.flatMap(itemToChars);
}

/** Port of legacy Indic.IsValid, operating on a candidate item list. */
export function isValidSyllable(items: string[]): boolean {
  const arr = itemsToChars(items);
  if (arr.length === 0) return false;
  if (arr.length === 1 && FULL_SPECIAL.has(arr[0])) return false;
  if (arr.length === 1 && SUNNA.has(arr[0])) return false;
  let special = 0, conso = 0, vowel = 0, sunna = 0;
  for (const c of arr) {
    if (FULL_SPECIAL.has(c)) { special++; continue; }
    if (SUNNA.has(c)) { sunna++; continue; }
    if (isConsonant(c)) { conso++; continue; }
    if (isVowel(c)) { vowel++; continue; }
  }
  if (conso > 0 && vowel > 0) return false;
  if (vowel > 0 && special > 0) return false;
  if (sunna > 1 || vowel > 1 || special > 1) return false;
  return true;
}

/** Port of legacy Indic.ToString: build the display glyph from items. */
export function syllableToString(items: string[]): string {
  const arr = itemsToChars(items);
  let res = '', pending = '', sunna = '', prevConso = false;
  for (const c of arr) {
    if (FULL_SPECIAL.has(c)) { pending = c; continue; }
    if (SUNNA.has(c)) { sunna = c; continue; }
    const curConso = isConsonant(c);
    res += prevConso && curConso ? '్' + c : c;
    prevConso = curConso;
  }
  return res + pending + sunna;
}

/**
 * Try to add a table tile to a cell's items.
 * Returns the new item list, or null if the combination is not a valid
 * syllable (legacy message: "'{0}' ను '{1}' తో కలపడం సాధ్యంకాదు").
 */
export function addTileToSyllable(items: string[], tile: string): string[] | null {
  const direct = [...items, tile];
  if (isValidSyllable(direct)) return direct;
  const syn = getSynonym(tile);
  if (syn && syn !== tile) {
    const viaSyn = [...items, syn];
    if (isValidSyllable(viaSyn)) return viaSyn;
  }
  // A multi-tile syllable tile (ము/లు/క్ష) placed on an empty cell is stored
  // as itself; on an occupied cell its component tiles may combine instead.
  if (items.length > 0 && SYLLABLE_TILES[tile]) {
    let cur = items;
    for (const part of SYLLABLE_TILES[tile]) {
      const next = addTileToSyllable(cur, part);
      if (!next) return null;
      cur = next;
    }
    return cur;
  }
  return null;
}

/** Which table tile a stored item came from (signs map back to vowels). */
export function itemToTile(item: string): string {
  if (item === '్') return VIRAMA_TILE;
  const syn = getSynonym(item);
  if (syn && VOWEL_SET.has(syn)) return syn;
  return item;
}

/**
 * Split one syllable from a dictionary tiles-form string (e.g. "రషఇ")
 * into table tiles, greedy longest-match (క్ష / ము / లు / ్‌ first).
 */
const MULTI_TILES = ['క్ష', 'ము', 'లు', VIRAMA_TILE];
export function splitSyllableTiles(syllable: string): string[] {
  const cps = Array.from(syllable);
  const tiles: string[] = [];
  let i = 0;
  while (i < cps.length) {
    let matched: string | null = null;
    for (const m of MULTI_TILES) {
      const mc = Array.from(m);
      if (mc.every((c, k) => cps[i + k] === c)) { matched = m; break; }
    }
    if (matched) { tiles.push(matched); i += Array.from(matched).length; }
    else { tiles.push(cps[i]); i += 1; }
  }
  return tiles;
}

/** Build the cell items for one dictionary syllable; null if it can't form. */
export function syllableTilesToItems(syllable: string): string[] | null {
  let items: string[] = [];
  for (const tile of splitSyllableTiles(syllable)) {
    const next = addTileToSyllable(items, tile);
    if (!next) return null;
    items = next;
  }
  return items.length ? items : null;
}

/** Readable word for a run of cells (legacy Indic.ToWord equivalent). */
export function cellsToWord(cellsItems: string[][]): string {
  return cellsItems.map(syllableToString).join('');
}
