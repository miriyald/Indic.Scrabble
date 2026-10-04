import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyMove, buildDictionary, findBotMove, newGame, validateMove,
} from '../src/engine/game';
import { cellsToWord, itemToTile } from '../src/engine/indic';
import { STAR_INDEX } from '../src/engine/te-config';

const pairs: [string, string][] = JSON.parse(
  readFileSync(new URL('../public/data/te-gallery.json', import.meta.url), 'utf8'),
);
const dict = buildDictionary(pairs);
// Validation compares against glyph forms our engine produces (no ZWNJ).
const engineReadableSet = new Set<string>();
for (const d of dict) {
  if (d.syllableItems) engineReadableSet.add(cellsToWord(d.syllableItems));
}

describe('game flow', () => {
  it('deals a 16-tile shared table from the cabinet', () => {
    const s = newGame(() => 0.42);
    expect(s.table.length).toBe(16);
    expect(s.board.length).toBe(121);
  });

  it('validates and scores a first word through the star', () => {
    const s = newGame(() => 0.42);
    const entry = dict.find((d) => d.syllableItems && d.syllableItems.length === 2)!;
    const pending = new Map<number, string[]>();
    pending.set(STAR_INDEX - 1, entry.syllableItems![0]);
    pending.set(STAR_INDEX, entry.syllableItems![1]);
    const v = validateMove(s.board, pending, engineReadableSet, true);
    expect(v.ok, v.error).toBe(true);
    expect(v.score).toBeGreaterThan(0);
    const needed = [...pending.values()].flat().map(itemToTile);
    s.table = [...needed, ...s.table].slice(0, 16);
    applyMove(s, pending, v, 0);
    expect(s.scores[0]).toBe(v.score);
    expect(s.board[STAR_INDEX].confirmed).toBe(true);
  });

  it('rejects a first word that misses the star', () => {
    const s = newGame(() => 0.42);
    const entry = dict.find((d) => d.syllableItems && d.syllableItems.length === 2)!;
    const pending = new Map<number, string[]>();
    pending.set(0, entry.syllableItems![0]);
    pending.set(1, entry.syllableItems![1]);
    const v = validateMove(s.board, pending, engineReadableSet, true);
    expect(v.ok).toBe(false);
  });

  it('bot finds a legal opening move when the table can form a word', () => {
    const s = newGame(() => 0.42);
    const entry = dict.find((d) => d.syllableItems && d.syllableItems.length === 3)!;
    const needed = entry.syllableItems!.flat().map(itemToTile);
    s.table = [...needed, 'క', 'మ', 'ర', 'ల', 'ప', 'త', 'అ', 'ఉ', 'గ', 'స', 'వ', 'య', 'ద'].slice(0, 16);
    const res = findBotMove(s, dict, engineReadableSet, 4000);
    expect(res, 'bot should find the seeded word').not.toBeNull();
    expect(res!.validation.ok).toBe(true);
  });
});
