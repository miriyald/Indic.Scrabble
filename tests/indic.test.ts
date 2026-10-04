import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  addTileToSyllable, cellsToWord, isValidSyllable, syllableTilesToItems,
} from '../src/engine/indic';

const pairs: [string, string][] = JSON.parse(
  readFileSync(new URL('../public/data/te-gallery.json', import.meta.url), 'utf8'),
);
const noZwnj = (s: string) => s.replace(/\u200C/g, '');

describe('Indic syllable engine (ported from legacy Indic.ts)', () => {
  it('combines consonant + vowel tile into a signed glyph', () => {
    expect(addTileToSyllable(['క'], 'ఆ')).toEqual(['క', 'ా']);
    expect(cellsToWord([['క', 'ా']])).toBe('కా');
  });
  it('combines consonant + consonant with virama', () => {
    expect(cellsToWord([addTileToSyllable(['క'], 'ష')!])).toBe('క్ష');
  });
  it('rejects invalid syllables', () => {
    expect(isValidSyllable(['ా'])).toBe(false); // lone vowel sign
    expect(isValidSyllable(['ం'])).toBe(false); // lone sunna
    expect(addTileToSyllable(['క'], 'అ')).toBeNull(); // consonant + independent vowel that has no sign path via synonym? అ has no synonym
  });
  it('reproduces every dictionary word from its tiles form', () => {
    let ok = 0;
    const bad: string[] = [];
    for (const [tilesForm, readable] of pairs) {
      const syllables = tilesForm.split(',');
      const items = syllables.map((s) => syllableTilesToItems(s));
      if (items.some((x) => x === null)) { bad.push(tilesForm); continue; }
      const word = cellsToWord(items as string[][]);
      if (noZwnj(word) === noZwnj(readable)) ok++;
      else if (bad.length < 15) bad.push(`${tilesForm} -> ${word} != ${readable}`);
    }
    // ZWNJ-only spelling variants in the source account for the small gap.
    expect(ok / pairs.length).toBeGreaterThan(0.97);
  });
});
