// Game state, turn validation, scoring, and the వసారా (Gallery) bot.
//
// Preserved from the original design:
//   - 11x11 board, centre star, board premiums from Boards.json
//   - a shared Game Table of 16 tiles (up to 8 from the vowel-side tray,
//     8 from the consonant tray) drawn from the cabinet — there is no
//     private rack in Indic Scrabble; both players play from the table
//   - a placed syllable may later be ALTERED by adding tiles to it
//   - single-syllable "orphan" words are not accepted
//   - every formed word must exist in the bot's vocabulary
import {
  BOARD_SIZE, BOARD_WEIGHTS, CONSONANT_TRAY, MAX_ON_TABLE,
  MAX_VOWELS_ON_TABLE, STAR_INDEX, TILE_WEIGHT, VOWEL_TRAY,
} from './te-config';
import {
  addTileToSyllable, cellsToWord, itemToTile, syllableTilesToItems,
} from './indic';

export interface DictEntry {
  tilesForm: string;
  readable: string;
  /** Cell items per syllable, precomputed; null when the word uses a
   *  legacy edge form this engine can't build (37 of 3814 words). */
  syllableItems: string[][] | null;
}

export function buildDictionary(pairs: [string, string][]): DictEntry[] {
  return pairs.map(([tilesForm, readable]) => {
    const parts = tilesForm.split(',').map((s) => syllableTilesToItems(s));
    return {
      tilesForm,
      readable,
      syllableItems: parts.some((p) => p === null) ? null : (parts as string[][]),
    };
  });
}

export interface Cell { items: string[]; confirmed: boolean }
export const emptyCell = (): Cell => ({ items: [], confirmed: false });

export interface PendingMove { index: number; addedItems: string[]; wasEmpty: boolean }

export interface GameState {
  board: Cell[];
  table: string[];          // tiles currently on the shared table
  vowelPool: string[];      // remaining cabinet, vowel-side tray
  consoPool: string[];      // remaining cabinet, consonant tray
  scores: [number, number]; // [human, bot]
  turn: 0 | 1;
  consecutivePasses: number;
  gameOver: boolean;
  lastWords: { by: string; word: string; score: number }[];
  moveCount: number;
}

const expandPool = (defs: { tile: string; c: number }[]) =>
  defs.flatMap((d) => Array<string>(d.c).fill(d.tile));

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const VOWEL_SIDE = new Set(VOWEL_TRAY.map((d) => d.tile));
export const isVowelSide = (tile: string) => VOWEL_SIDE.has(tile);

function refillTable(s: GameState, rnd: () => number): void {
  const need = (side: (t: string) => boolean, max: number, pool: string[]) => {
    let onTable = s.table.filter(side).length;
    while (onTable < max && pool.length > 0) {
      s.table.push(pool.pop()!);
      onTable++;
    }
  };
  need(isVowelSide, MAX_VOWELS_ON_TABLE, s.vowelPool);
  need((t) => !isVowelSide(t), MAX_ON_TABLE - MAX_VOWELS_ON_TABLE, s.consoPool);
}

export function newGame(rnd: () => number = Math.random): GameState {
  const s: GameState = {
    board: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, emptyCell),
    table: [],
    vowelPool: shuffle(expandPool(VOWEL_TRAY), rnd),
    consoPool: shuffle(expandPool(CONSONANT_TRAY), rnd),
    scores: [0, 0],
    turn: 0,
    consecutivePasses: 0,
    gameOver: false,
    lastWords: [],
    moveCount: 0,
  };
  refillTable(s, rnd);
  return s;
}

export const rowOf = (i: number) => Math.floor(i / BOARD_SIZE);
export const colOf = (i: number) => i % BOARD_SIZE;

/** Points for one syllable's items: tile weights, signs count as their vowel. */
export function syllableScore(items: string[]): number {
  return items.reduce((sum, it) => sum + (TILE_WEIGHT[itemToTile(it)] ?? 1), 0);
}

export interface FormedWord { word: string; cells: number[]; score: number }
export interface Validation { ok: boolean; error?: string; words: FormedWord[]; score: number }

/**
 * Validate a set of pending placements against a board.
 * `pending` maps cell index -> full new item list for that cell.
 */
export function validateMove(
  board: Cell[],
  pending: Map<number, string[]>,
  readableSet: Set<string>,
  isFirstMove: boolean,
): Validation {
  const fail = (error: string): Validation => ({ ok: false, error, words: [], score: 0 });
  if (pending.size === 0) return fail('ముందు కొన్ని అక్షరాలు పేర్చండి. Place some tiles first.');

  const idxs = [...pending.keys()];
  const rows = new Set(idxs.map(rowOf));
  const cols = new Set(idxs.map(colOf));
  const sameRow = rows.size === 1;
  const sameCol = cols.size === 1;
  if (!sameRow && !sameCol) return fail('అన్నీ ఒకే నిలువు లేదా అడ్డం గడులలో మాత్రమే ఉండాలి. All tiles must be in one row or one column.');

  const eff = (i: number): string[] => pending.get(i) ?? board[i].items;
  const occupied = (i: number) => eff(i).length > 0;

  // Contiguity along the played line.
  const line = sameRow
    ? Array.from({ length: BOARD_SIZE }, (_, c) => rowOf(idxs[0]) * BOARD_SIZE + c)
    : Array.from({ length: BOARD_SIZE }, (_, r) => r * BOARD_SIZE + colOf(idxs[0]));
  const pos = idxs.map((i) => (sameRow ? colOf(i) : rowOf(i)));
  for (let p = Math.min(...pos); p <= Math.max(...pos); p++) {
    if (!occupied(line[p])) return fail('పదంలో ఖాళీలు ఉండకూడదు. No gaps allowed inside a word.');
  }

  // Connectivity.
  if (isFirstMove) {
    if (!pending.has(STAR_INDEX)) return fail('మొదటి పదం మధ్యలోని నక్షత్రం (★) మీదుగా వెళ్లాలి. The first word must cover the centre star.');
  } else {
    const touches = idxs.some((i) => {
      if (board[i].confirmed && board[i].items.length > 0) return true; // altered a confirmed cell
      const r = rowOf(i), c = colOf(i);
      return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .some(([rr, cc]) => rr >= 0 && cc >= 0 && rr < BOARD_SIZE && cc < BOARD_SIZE && board[rr * BOARD_SIZE + cc].confirmed);
    });
    if (!touches) return fail('పదం పటంలోని అక్షరాలను తాకాలి. The word must connect to existing letters.');
  }

  // Collect every run (length >= 2) that includes a touched cell.
  const touched = new Set(idxs);
  const runs = new Map<string, number[]>();
  const collectRun = (cells: number[]) => {
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 2 && run.some((i) => touched.has(i))) {
        runs.set(run.join('-'), [...run]);
      }
      run = [];
    };
    for (const i of cells) { if (occupied(i)) run.push(i); else flush(); }
    flush();
  };
  for (let r = 0; r < BOARD_SIZE; r++) collectRun(Array.from({ length: BOARD_SIZE }, (_, c) => r * BOARD_SIZE + c));
  for (let c = 0; c < BOARD_SIZE; c++) collectRun(Array.from({ length: BOARD_SIZE }, (_, r) => r * BOARD_SIZE + c));

  if (runs.size === 0) return fail('ఏకాక్షరపదాలు అంగీకారం కావు. Single-syllable words are not accepted — form a word of 2+ syllables.');
  for (const i of idxs) {
    if (![...runs.values()].some((run) => run.includes(i))) {
      return fail('ప్రతి అక్షరం ఒక పదంలో భాగం కావాలి. Every placed syllable must be part of a word.');
    }
  }

  const words: FormedWord[] = [];
  for (const cells of runs.values()) {
    const word = cellsToWord(cells.map((i) => eff(i)));
    if (!readableSet.has(word)) return fail(`'${word}' పదకోశంలో లేదు. '${word}' is not in the vocabulary.`);
    let score = 0;
    for (const i of cells) {
      score += syllableScore(eff(i)) + (touched.has(i) ? BOARD_WEIGHTS[i] : 0);
    }
    words.push({ word, cells, score });
  }
  return { ok: true, words, score: words.reduce((a, w) => a + w.score, 0) };
}

/** Apply a validated move: confirm cells, consume table tiles, refill. */
export function applyMove(
  s: GameState,
  pending: Map<number, string[]>,
  v: Validation,
  by: 0 | 1,
  rnd: () => number = Math.random,
): void {
  for (const [i, items] of pending) {
    const added = items.slice(s.board[i].items.length);
    s.board[i] = { items, confirmed: true };
    for (const it of added) {
      const tile = itemToTile(it);
      const at = s.table.indexOf(tile);
      if (at >= 0) s.table.splice(at, 1);
    }
  }
  s.scores[by] += v.score;
  for (const w of v.words) s.lastWords.unshift({ by: by === 0 ? 'మీరు' : 'వసారా', word: w.word, score: w.score });
  s.lastWords = s.lastWords.slice(0, 8);
  s.consecutivePasses = 0;
  s.moveCount++;
  refillTable(s, rnd);
  s.turn = by === 0 ? 1 : 0;
  if (s.vowelPool.length === 0 && s.consoPool.length === 0 && s.table.length === 0) s.gameOver = true;
}

export function applyPass(s: GameState): void {
  s.consecutivePasses++;
  if (s.consecutivePasses >= 4) s.gameOver = true;
  s.turn = s.turn === 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Bot (వసారా): greedy best-score search over its vocabulary, using only the
// tiles on the shared table. Runs with a time budget so a phone never janks.
export interface BotResult { pending: Map<number, string[]>; validation: Validation }

export function findBotMove(
  s: GameState,
  dict: DictEntry[],
  readableSet: Set<string>,
  budgetMs = 1500,
): BotResult | null {
  const start = performance.now();
  const isFirst = s.moveCount === 0;
  const tableCount = new Map<string, number>();
  for (const t of s.table) tableCount.set(t, (tableCount.get(t) ?? 0) + 1);

  const occupiedIdx: number[] = [];
  s.board.forEach((c, i) => { if (c.confirmed) occupiedIdx.push(i); });

  let best: BotResult | null = null;
  const order = [...dict];
  // Light shuffle so equal-score games vary; seeded by table contents.
  for (let i = order.length - 1; i > 0; i--) {
    const j = (i * 2654435761 + s.table.join().length * 97) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (const entry of order) {
    if (performance.now() - start > budgetMs) break;
    if (!entry.syllableItems || entry.syllableItems.length < 2) continue;
    const res = findBotMoveForWord(s, entry, tableCount, readableSet, isFirst);
    if (res && (!best || res.validation.score > best.validation.score)) best = res;
  }
  return best;
}

/** Try every legal placement of one dictionary word; return the best. */
function findBotMoveForWord(
  s: GameState,
  entry: DictEntry,
  tableCount: Map<string, number>,
  readableSet: Set<string>,
  isFirst: boolean,
): BotResult | null {
  const syl = entry.syllableItems!;
  let best: BotResult | null = null;

  for (const dir of [0, 1] as const) {
    for (let line = 0; line < BOARD_SIZE; line++) {
      for (let start = 0; start + syl.length <= BOARD_SIZE; start++) {
        const idxs = syl.map((_, k) => (dir === 0
          ? line * BOARD_SIZE + start + k
          : (start + k) * BOARD_SIZE + line));

        // Overlap / connectivity quick check.
        let overlaps = 0;
        let impossible = false;
        const need = new Map<string, number>();
        const pending = new Map<number, string[]>();
        for (let k = 0; k < syl.length; k++) {
          const cell = s.board[idxs[k]];
          const target = syl[k];
          if (cell.confirmed) {
            overlaps++;
            const cur = cell.items;
            const isPrefix = cur.length <= target.length && cur.every((v, j) => v === target[j]);
            if (!isPrefix) { impossible = true; break; }
            const added = target.slice(cur.length);
            if (added.length > 0) {
              pending.set(idxs[k], target);
              for (const it of added) {
                const t = itemToTile(it);
                need.set(t, (need.get(t) ?? 0) + 1);
              }
            }
          } else {
            pending.set(idxs[k], target);
            for (const it of target) {
              const t = itemToTile(it);
              need.set(t, (need.get(t) ?? 0) + 1);
            }
          }
        }
        if (impossible || pending.size === 0) continue;
        if (isFirst) {
          if (!idxs.includes(STAR_INDEX)) continue;
        } else if (overlaps === 0) {
          const adjacent = idxs.some((i) => {
            const r = rowOf(i), c = colOf(i);
            return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
              .some(([rr, cc]) => rr >= 0 && cc >= 0 && rr < BOARD_SIZE && cc < BOARD_SIZE && s.board[rr * BOARD_SIZE + cc].confirmed);
          });
          if (!adjacent) continue;
        }
        let affordable = true;
        for (const [t, n] of need) if ((tableCount.get(t) ?? 0) < n) { affordable = false; break; }
        if (!affordable) continue;

        const v = validateMove(s.board, pending, readableSet, isFirst);
        if (v.ok && (!best || v.score > best.validation.score)) {
          best = { pending, validation: v };
        }
      }
    }
  }
  return best;
}

/** Can this syllable be built/extended by adding `tile`? UI helper. */
export function tryAddTile(items: string[], tile: string): string[] | null {
  return addTileToSyllable(items, tile);
}
