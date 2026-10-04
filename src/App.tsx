import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyMove, applyPass, buildDictionary, findBotMove, newGame, tryAddTile, validateMove,
  type DictEntry, type GameState,
} from './engine/game';
import { cellsToWord, syllableToString } from './engine/indic';
import { BOARD_WEIGHTS, STAR_INDEX, TILE_WEIGHT } from './engine/te-config';

interface PlacedAction { cell: number; tile: string; after: string[] }

export default function App() {
  const [dict, setDict] = useState<DictEntry[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [game, setGame] = useState<GameState>(() => newGame());
  const [actions, setActions] = useState<PlacedAction[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [message, setMessage] = useState('మీ వంతు. ముందు ఒక అక్షరం ఎంచుకుని, తర్వాత గడి నొక్కండి. Your turn — tap a tile, then a cell.');
  const [botThinking, setBotThinking] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    fetch('./data/te-gallery.json')
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((pairs: [string, string][]) => setDict(buildDictionary(pairs)))
      .catch((e) => setLoadError(String(e)));
  }, []);

  const readableSet = useMemo(() => {
    const set = new Set<string>();
    if (dict) for (const d of dict) if (d.syllableItems) set.add(cellsToWord(d.syllableItems));
    return set;
  }, [dict]);

  const pendingMap = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const a of actions) m.set(a.cell, a.after);
    return m;
  }, [actions]);

  const usedTiles = useMemo(() => actions.map((a) => a.tile), [actions]);
  const tileUsed = (tile: string, nth: number) =>
    usedTiles.filter((t) => t === tile).length > nth;

  const refresh = () => setGame({ ...gameRef.current });

  // ---- Bot turn -----------------------------------------------------------
  useEffect(() => {
    if (!dict || game.turn !== 1 || game.gameOver) return;
    setBotThinking(true);
    const timer = setTimeout(() => {
      const s = gameRef.current;
      const res = findBotMove(s, dict, readableSet, 1200);
      if (res) {
        applyMove(s, res.pending, res.validation, 1);
        const words = res.validation.words.map((w) => w.word).join(', ');
        setMessage(`వసారా '${words}' పేర్చారు (+${res.validation.score}). మీ వంతు. Bot played ${words}. Your turn.`);
      } else {
        applyPass(s);
        setMessage('వసారా పదం పేర్చలేకపోయారు — పాస్. Bot passes. Your turn.');
      }
      setBotThinking(false);
      refresh();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.turn, game.gameOver, dict]);

  // ---- Human interactions -------------------------------------------------
  function tapCell(index: number) {
    if (!dict || game.turn !== 0 || game.gameOver || botThinking) return;
    if (!selectedTile) {
      setMessage('ముందు కింద ఉన్న అక్షరాన్ని ఎంచుకోండి. First tap a tile from the table below.');
      return;
    }
    const current = pendingMap.get(index) ?? game.board[index].items;
    const next = tryAddTile(current, selectedTile);
    if (!next) {
      setMessage(`'${selectedTile}' ను ఆ గడిలో కలపడం సాధ్యంకాదు. '${selectedTile}' can't combine in that cell.`);
      return;
    }
    setActions([...actions, { cell: index, tile: selectedTile, after: next }]);
    setSelectedTile(null);
    setMessage('');
  }

  function play() {
    const v = validateMove(game.board, pendingMap, readableSet, game.moveCount === 0);
    if (!v.ok) { setMessage(v.error!); return; }
    applyMove(game, pendingMap, v, 0);
    setActions([]);
    setSelectedTile(null);
    setMessage(`'${v.words.map((w) => w.word).join(', ')}' (+${v.score}). వసారా ఆలోచిస్తున్నారు…`);
    refresh();
  }

  function pass() {
    setActions([]);
    setSelectedTile(null);
    applyPass(game);
    setMessage('మీరు పాస్ చేశారు. వసారా ఆలోచిస్తున్నారు… You passed.');
    refresh();
  }

  function restart() {
    const s = newGame();
    gameRef.current = s;
    setGame(s);
    setActions([]);
    setSelectedTile(null);
    setMessage('కొత్త ఆట. మీ వంతు — మొదటి పదం ★ మీదుగా వెళ్లాలి. New game — first word must cover the ★.');
  }

  if (loadError) return <div className="screen">పదకోశం లోడ్ కాలేదు. Dictionary failed to load: {loadError}</div>;
  if (!dict) return <div className="screen">పదకోశం లోడ్ అవుతోంది… Loading dictionary…</div>;

  const cabinetLeft = game.vowelPool.length + game.consoPool.length;
  const winner = game.scores[0] === game.scores[1] ? null : game.scores[0] > game.scores[1] ? 0 : 1;

  return (
    <div className="app">
      <header>
        <h1>Indic Scrabble <span className="lang">తెలుగు</span></h1>
        <div className="scores">
          <div className={`score ${game.turn === 0 && !game.gameOver ? 'active' : ''}`}>మీరు You<b>{game.scores[0]}</b></div>
          <div className={`score ${game.turn === 1 && !game.gameOver ? 'active' : ''}`}>వసారా Bot<b>{game.scores[1]}</b></div>
          <div className="cabinet" title="Cabinet tiles remaining">🗄️ {cabinetLeft}</div>
        </div>
      </header>

      {message && <div className="message" role="status">{botThinking ? '🤔 ' : ''}{message}</div>}

      <div className="board" role="grid" aria-label="Game board">
        {game.board.map((cell, i) => {
          const pendingItems = pendingMap.get(i);
          const items = pendingItems ?? cell.items;
          const w = BOARD_WEIGHTS[i];
          return (
            <button
              key={i}
              className={[
                'cell',
                w === 8 ? 'premium8' : w === 3 ? 'premium3' : '',
                cell.confirmed ? 'confirmed' : '',
                pendingItems ? 'pending' : '',
              ].join(' ')}
              onClick={() => tapCell(i)}
              aria-label={`cell ${i + 1}`}
            >
              {items.length > 0 ? syllableToString(items) : i === STAR_INDEX ? '★' : w === 8 ? '8' : w === 3 ? '3' : ''}
            </button>
          );
        })}
      </div>

      <div className="table-label">ఉమ్మడి బల్ల — Shared table (tap a tile, then a cell)</div>
      <div className="table">
        {game.table.map((tile, i) => {
          const nth = game.table.slice(0, i).filter((t) => t === tile).length;
          const used = tileUsed(tile, nth);
          const showSelected = selectedTile === tile && !used &&
            nth === usedTiles.filter((t) => t === tile).length;
          return (
            <button
              key={i}
              className={`tile ${showSelected ? 'selected' : ''}`}
              disabled={used || game.turn !== 0 || game.gameOver}
              onClick={() => setSelectedTile(selectedTile === tile ? null : tile)}
            >
              {used ? '·' : tile}
              {!used && <sup>{TILE_WEIGHT[tile] ?? ''}</sup>}
            </button>
          );
        })}
      </div>

      <div className="actions">
        <button className="primary" onClick={play} disabled={actions.length === 0 || game.turn !== 0}>▶ ఆడండి Play</button>
        <button onClick={() => { setActions(actions.slice(0, -1)); }} disabled={actions.length === 0}>↩ Undo</button>
        <button onClick={() => setActions([])} disabled={actions.length === 0}>Recall</button>
        <button onClick={pass} disabled={game.turn !== 0 || game.gameOver}>Pass</button>
      </div>

      {game.lastWords.length > 0 && (
        <div className="words">
          {game.lastWords.map((w, i) => (
            <span key={i} className="word-chip">{w.by}: {w.word} +{w.score}</span>
          ))}
        </div>
      )}

      <details className="help">
        <summary>ఎలా ఆడాలి? How to play</summary>
        <p>Both players play from the shared 16-tile table (8 vowels + 8 consonants) — there is no private rack.
        Tap a tile, then tap a cell to place it. Tap more tiles onto an existing syllable to <i>alter</i> it into a new
        syllable (క + ఆ → కా, క + ష → క్ష). All tiles in a turn must form words in one row or column, connect to the
        board, and every word must be in the వసారా vocabulary. First word must cover the ★. Gold cells add 8, blue cells
        add 3, to a newly-touched syllable's score. Four passes in a row end the game.</p>
      </details>

      {game.gameOver && (
        <div className="overlay">
          <div className="dialog">
            <h2>ఆట పూర్తయ్యింది — Game over</h2>
            <p>{winner === null ? '!!..ఇద్దరూ విజేతలే..!! Match tied!' : winner === 0 ? '🎉 విజేత: మీరు! You win!' : 'విజేత: వసారా Bot. Bot wins.'}</p>
            <p>మీరు {game.scores[0]} — వసారా {game.scores[1]}</p>
            <button className="primary" onClick={restart}>కొత్త ఆట New game</button>
          </div>
        </div>
      )}
      {game.gameOver === false && game.moveCount > 0 && (
        <button className="restart" onClick={restart}>↺ Restart</button>
      )}
    </div>
  );
}
