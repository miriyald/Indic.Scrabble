// Dictionary pipeline (Phase 1 of the modernization plan).
//
// Legacy sources (kept verbatim under data-source/, copied from the original
// repo — Scrabble/bots/te.gallery.txt and Scrabble/words/te.gallery.words):
//   - te.gallery.txt   : words in "Scrabble tiles" form — syllables separated
//                        by ',', each syllable is its tiles concatenated.
//   - te.gallery.words : the same words in readable Telugu, line-aligned.
//
// Output: public/data/te-gallery.json — a compact, deduped array of
// [tilesForm, readableForm] pairs, lazy-loaded by the app only for the
// chosen language/bot. The full legacy vocabularies total ~197 MB; this
// starter bot (వసారా / "Gallery") compiles to ~200 KB (~60 KB gzipped).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strip = (s) => s.replace(/^\uFEFF/, '').trim();
const tilesLines = readFileSync(join(root, 'data-source/te.gallery.txt'), 'utf8').split(/\r?\n/).map(strip).filter(Boolean);
const wordLines = readFileSync(join(root, 'data-source/te.gallery.words'), 'utf8').split(/\r?\n/).map(strip).filter(Boolean);

if (tilesLines.length !== wordLines.length) {
  throw new Error(`Line misalignment: tiles=${tilesLines.length} words=${wordLines.length}`);
}

const seen = new Set();
const pairs = [];
for (let i = 0; i < tilesLines.length; i++) {
  if (seen.has(tilesLines[i])) continue;
  seen.add(tilesLines[i]);
  pairs.push([tilesLines[i], wordLines[i]]);
}

mkdirSync(join(root, 'public/data'), { recursive: true });
const json = JSON.stringify(pairs);
writeFileSync(join(root, 'public/data/te-gallery.json'), json);
console.log(`dictionary: ${pairs.length} unique words (from ${tilesLines.length} lines)`);
console.log(`json: ${(json.length / 1024).toFixed(1)} KB, gzipped: ${(gzipSync(json).length / 1024).toFixed(1)} KB`);
