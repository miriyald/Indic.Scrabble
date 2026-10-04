// Telugu configuration, ported verbatim from the legacy server's
// authoritative resources:
//   Scrabble.Server/Resources/CharSets.json  ("te")
//   Scrabble.Server/Resources/Boards.json    ("te.11x11")
// W = tile weight (points), C = tile count in the cabinet.

export const VOWELS: string[] = [
  'అ', 'ఆ', 'ఇ', 'ఈ', 'ఉ', 'ఊ', 'ఎ', 'ఏ', 'ఐ', 'ఒ', 'ఓ', 'ఔ', 'ఋ', 'ౠ',
];

export const CONSONANTS: string[] = [
  'క', 'ఖ', 'గ', 'ఘ', 'ఙ',
  'చ', 'ఛ', 'జ', 'ఝ', 'ఞ',
  'ట', 'ఠ', 'డ', 'ఢ', 'ణ',
  'త', 'థ', 'ద', 'ధ', 'న',
  'ప', 'ఫ', 'బ', 'భ', 'మ',
  'య', 'ర', 'ల', 'వ',
  'శ', 'ష', 'స', 'హ',
  'ళ', 'ఱ', 'క్ష', 'ము', 'లు',
];

export const SUNNA_SET: string[] = ['ం', 'ః'];
export const VIRAMA = '్';
/** Virama + ZWNJ, a tile in the vowel-side tray in the original cabinet. */
export const VIRAMA_TILE = '్‌';

export const SPECIAL_SET: string[] = [
  'ా', 'ి', 'ీ', 'ు', 'ూ', 'ృ', 'ౄ', 'ె', 'ే', 'ై', 'ొ', 'ో', 'ౌ',
];
export const FULL_SPECIAL_SET: string[] = [...SPECIAL_SET, '్', '్‌'];

/** Independent vowel <-> dependent vowel sign, both directions (legacy Synonyms). */
export const SYNONYMS: Record<string, string> = {
  'ఆ': 'ా', 'ఇ': 'ి', 'ఈ': 'ీ', 'ఉ': 'ు', 'ఊ': 'ూ', 'ఋ': 'ృ', 'ౠ': 'ౄ',
  'ఎ': 'ె', 'ఏ': 'ే', 'ఐ': 'ై', 'ఒ': 'ొ', 'ఓ': 'ో', 'ఔ': 'ౌ',
  'ా': 'ఆ', 'ి': 'ఇ', 'ీ': 'ఈ', 'ు': 'ఉ', 'ూ': 'ఊ', 'ృ': 'ఋ', 'ౄ': 'ౠ',
  'ె': 'ఎ', 'ే': 'ఏ', 'ై': 'ఐ', 'ొ': 'ఒ', 'ో': 'ఓ', 'ౌ': 'ఔ',
};

/** Tiles that are themselves a whole syllable made of two base tiles. */
export const SYLLABLE_TILES: Record<string, string[]> = {
  'ము': ['మ', 'ఉ'],
  'లు': ['ల', 'ఉ'],
  'క్ష': ['క', 'ష'],
};
/** The same syllables at character (glyph-building) level. */
export const SYLLABLE_CHARS: Record<string, string[]> = {
  'ము': ['మ', 'ు'],
  'లు': ['ల', 'ు'],
  'క్ష': ['క', 'ష'],
};

export interface TileDef { tile: string; w: number; c: number }

export const VOWEL_TRAY: TileDef[] = [
  { tile: 'అ', w: 5, c: 1 }, { tile: 'ఆ', w: 1, c: 5 }, { tile: 'ఇ', w: 1, c: 5 },
  { tile: 'ఈ', w: 1, c: 5 }, { tile: 'ఉ', w: 1, c: 5 }, { tile: 'ఊ', w: 1, c: 5 },
  { tile: 'ఎ', w: 1, c: 5 }, { tile: 'ఏ', w: 1, c: 5 }, { tile: 'ఐ', w: 1, c: 5 },
  { tile: 'ఒ', w: 1, c: 5 }, { tile: 'ఓ', w: 1, c: 5 }, { tile: 'ఔ', w: 1, c: 5 },
  { tile: 'ఋ', w: 3, c: 3 }, { tile: 'ౠ', w: 3, c: 3 },
  { tile: 'ం', w: 5, c: 1 }, { tile: 'ః', w: 5, c: 1 }, { tile: '్‌', w: 5, c: 1 },
];

export const CONSONANT_TRAY: TileDef[] = [
  { tile: 'క', w: 1, c: 5 }, { tile: 'ఖ', w: 5, c: 1 }, { tile: 'గ', w: 1, c: 5 },
  { tile: 'ఘ', w: 5, c: 1 }, { tile: 'ఙ', w: 5, c: 1 },
  { tile: 'చ', w: 1, c: 5 }, { tile: 'ఛ', w: 3, c: 3 }, { tile: 'జ', w: 1, c: 5 },
  { tile: 'ఝ', w: 3, c: 3 }, { tile: 'ఞ', w: 5, c: 1 },
  { tile: 'ట', w: 1, c: 5 }, { tile: 'ఠ', w: 5, c: 1 }, { tile: 'డ', w: 1, c: 5 },
  { tile: 'ఢ', w: 3, c: 3 }, { tile: 'ణ', w: 5, c: 1 },
  { tile: 'త', w: 1, c: 5 }, { tile: 'థ', w: 5, c: 1 }, { tile: 'ద', w: 1, c: 5 },
  { tile: 'ధ', w: 3, c: 3 }, { tile: 'న', w: 5, c: 1 },
  { tile: 'ప', w: 1, c: 5 }, { tile: 'ఫ', w: 5, c: 1 }, { tile: 'బ', w: 1, c: 5 },
  { tile: 'భ', w: 1, c: 5 }, { tile: 'మ', w: 1, c: 5 },
  { tile: 'య', w: 1, c: 5 }, { tile: 'ర', w: 1, c: 5 }, { tile: 'ల', w: 1, c: 5 },
  { tile: 'వ', w: 1, c: 5 },
  { tile: 'శ', w: 1, c: 5 }, { tile: 'ష', w: 1, c: 5 }, { tile: 'స', w: 1, c: 5 },
  { tile: 'హ', w: 1, c: 5 },
  { tile: 'ళ', w: 3, c: 3 }, { tile: 'ఱ', w: 5, c: 1 },
  { tile: 'క్ష', w: 5, c: 1 }, { tile: 'ము', w: 1, c: 5 }, { tile: 'లు', w: 1, c: 5 },
];

export const TILE_WEIGHT: Record<string, number> = Object.fromEntries(
  [...VOWEL_TRAY, ...CONSONANT_TRAY].map((d) => [d.tile, d.w]),
);

export const BOARD_SIZE = 11;
export const STAR_INDEX = 60; // centre cell, from Boards.json
/** Per-cell premium (Boards.json "Weights"): 8 = star/corner class, 3 = premium, 0 = none. */
export const BOARD_WEIGHTS: number[] = [
  8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8,
  0, 8, 3, 3, 3, 3, 3, 3, 3, 8, 0,
  0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0,
  0, 3, 0, 8, 3, 3, 3, 8, 0, 3, 0,
  0, 3, 0, 3, 0, 0, 0, 3, 0, 3, 0,
  0, 3, 0, 3, 0, 8, 0, 3, 0, 3, 0,
  0, 3, 0, 3, 0, 0, 0, 3, 0, 3, 0,
  0, 3, 0, 8, 3, 3, 3, 8, 0, 3, 0,
  0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0,
  0, 8, 3, 3, 3, 3, 3, 3, 3, 8, 0,
  8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8,
];

export const MAX_ON_TABLE = 16;
export const MAX_VOWELS_ON_TABLE = 8;
