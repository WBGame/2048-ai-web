/* ════════════════════════════════════════════════
   2048 — 纯函数游戏核心
   ════════════════════════════════════════════════ */

/** 创建空白 4×4 棋盘（0 表示空格） */
function createBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

/** 在随机空格生成 2（90%）或 4（10%），返回新棋盘 */
function addRandom(board) {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board[r][c] === 0) empty.push([r, c]);

  if (empty.length === 0) return board;

  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

/**
 * 将单行向左合并，返回 { row, score, mergedCols }
 * mergedCols：本次发生合并的列索引（合并后的位置）
 */
function slideLeft(row) {
  const tiles = row.filter(x => x !== 0);
  const merged = [];
  const mergedCols = new Set();
  let score = 0;
  let i = 0;

  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i] * 2;
      merged.push(val);
      mergedCols.add(merged.length - 1);
      score += val;
      i += 2;
    } else {
      merged.push(tiles[i]);
      i++;
    }
  }

  while (merged.length < 4) merged.push(0);
  return { row: merged, score, mergedCols };
}

/** 矩阵转置 */
function transpose(b) {
  return b[0].map((_, c) => b.map(row => row[c]));
}

/** 每行反转 */
function flipRows(b) {
  return b.map(row => [...row].reverse());
}

/**
 * 执行一次移动
 * dir: 'left' | 'right' | 'up' | 'down'
 * 返回 { board, score, mergedCells }
 * mergedCells: Set of 'r,c' 标识合并后发光的格子
 */
function applyMove(board, dir) {
  // 将所有方向统一转换为"向左"操作
  let b = board;
  let pre, post;

  switch (dir) {
    case 'left':
      pre = x => x;
      post = x => x;
      break;
    case 'right':
      pre = flipRows;
      post = flipRows;
      break;
    case 'up':
      pre = transpose;
      post = transpose;
      break;
    case 'down':
      pre = x => flipRows(transpose(x));
      post = x => transpose(flipRows(x));
      break;
  }

  const transformed = pre(b);
  const results = transformed.map(row => slideLeft(row));
  const newTransformed = results.map(r => r.row);
  const newBoard = post(newTransformed);

  // 计算总得分
  const score = results.reduce((s, r) => s + r.score, 0);

  // 追踪合并格子（在最终棋盘坐标中）
  const mergedCells = new Set();
  const afterTranspose = post(results.map((r, rowIdx) => {
    // 为 mergedCols 映射到原始坐标，逐格标记
    return r.row.map((val, colIdx) => {
      if (r.mergedCols.has(colIdx)) mergedCells.add(`${rowIdx},${colIdx}`);
      return val;
    });
  }));
  // 修正：mergedCells 需在 post 变换后坐标中重建
  const mergedFinal = computeMergedInFinal(results, pre, post);

  return { board: newBoard, score, mergedCells: mergedFinal };
}

/**
 * 计算合并格子在最终棋盘坐标中的位置
 * 通过把标记矩阵经过 post 变换来确定
 */
function computeMergedInFinal(results, pre, post) {
  // 构建合并标记矩阵（transform 空间）
  const markMatrix = results.map(r =>
    r.row.map((_, colIdx) => r.mergedCols.has(colIdx) ? 1 : 0)
  );
  // 经 post 变换回原始坐标
  const finalMark = post(markMatrix);
  const set = new Set();
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (finalMark[r][c]) set.add(`${r},${c}`);
  return set;
}

/** 检查棋盘是否与另一个相同 */
function boardsEqual(a, b) {
  return a.every((row, r) => row.every((v, c) => v === b[r][c]));
}

/** 棋盘是否还有合法移动 */
function canMove(board) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  return false;
}

/** 棋盘中是否出现 2048 */
function hasWon(board) {
  return board.some(row => row.includes(2048));
}

/* ════════════════════════════════════════════════
   游戏状态
   ════════════════════════════════════════════════ */

const BEST_KEY = '2048-best-v2';

let state = {
  board: createBoard(),
  score: 0,
  best: Number(localStorage.getItem(BEST_KEY)) || 0,
  over: false,
  won: false,
  keepPlaying: false,
};

function newGame() {
  // 取消进行中的动画
  if (animTimeout) { clearTimeout(animTimeout); animTimeout = null; }
  animating = false;
  prevBoard = null;

  // 停止 AI（防御性：AI 变量在新代码段定义）
  if (typeof aiInterval !== 'undefined' && aiInterval) {
    clearInterval(aiInterval); aiInterval = null;
  }
  aiRunning = false;
  const _btnAI = document.getElementById('btn-ai');
  if (_btnAI) { _btnAI.textContent = '🤖 AI'; _btnAI.classList.remove('ai-active'); }
  const _aiStatus = document.getElementById('ai-status');
  if (_aiStatus) _aiStatus.hidden = true;

  let board = createBoard();
  board = addRandom(board);
  board = addRandom(board);

  state = {
    board,
    score: 0,
    best: state.best,
    over: false,
    won: false,
    keepPlaying: false,
  };
  render();
}

function move(dir) {
  if (state.over) return;
  if (state.won && !state.keepPlaying) return;
  if (animating) return; // 等待滑动动画完成

  const prevSnapshot = state.board.map(row => [...row]);
  const { board, score, mergedCells } = applyMove(state.board, dir);

  if (boardsEqual(board, state.board)) return; // 无效移动

  const boardAfterMove = board; // addRandom 前的棋盘（用于区分新随机方块）
  state.board = addRandom(board);
  state.score += score;

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_KEY, state.best);
  }
  if (!state.won && hasWon(state.board)) state.won = true;
  if (!canMove(state.board)) state.over = true;

  // 音效
  if (mergedCells.size > 0) {
    mergedCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      playMerge(state.board[r][c]);
    });
  } else {
    playMove();
  }
  if (state.over) setTimeout(playGameOver, 320);

  // 滑动动画
  renderWithAnimation(computeMoveInfo(prevSnapshot, dir), mergedCells, score, boardAfterMove);
}

/* ════════════════════════════════════════════════
   渲染层
   ════════════════════════════════════════════════ */

const elScore    = document.getElementById('score');
const elBest     = document.getElementById('best');
const elTiles    = document.getElementById('tile-layer');
const elOverlay  = document.getElementById('overlay');
const elOverMsg  = document.getElementById('overlay-msg');

/** 获取瓦片的 CSS 类（配色） */
function tileClass(val) {
  if (val <= 2048) return `t${val}`;
  return 'tsuper';
}

/** 计算瓦片的 top/left（使用 CSS 变量 calc） */
function tilePos(row, col) {
  return {
    top:  `calc(var(--pad) + ${row} * (var(--cell-size) + var(--gap)))`,
    left: `calc(var(--pad) + ${col} * (var(--cell-size) + var(--gap)))`,
  };
}

/** 追踪上一帧中每个格子的值，用于标记新出现 vs 合并 */
let prevBoard = null;

function render(mergedCells = new Set()) {
  // 更新分数
  elScore.textContent = state.score;
  elBest.textContent  = state.best;

  // 重建瓦片 DOM
  elTiles.innerHTML = '';

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = state.board[r][c];
      if (val === 0) continue;

      const el = document.createElement('div');
      el.className = `tile ${tileClass(val)}`;
      el.textContent = val;
      el.setAttribute('aria-label', `${val}`);

      const pos = tilePos(r, c);
      el.style.top  = pos.top;
      el.style.left = pos.left;

      const key = `${r},${c}`;
      if (mergedCells.has(key)) {
        el.classList.add('tile-merged');
      } else if (!prevBoard || prevBoard[r][c] === 0) {
        el.classList.add('tile-new');
      }

      elTiles.appendChild(el);
    }
  }

  prevBoard = state.board.map(row => [...row]);

  // 显示/隐藏覆盖层
  if (state.over) {
    elOverMsg.textContent = '游戏结束！';
    document.getElementById('final-score').textContent = state.score;
    elOverlay.classList.remove('hidden');
  } else if (state.won && !state.keepPlaying) {
    elOverMsg.textContent = '🎉 你赢了！';
    document.getElementById('final-score').textContent = state.score;
    elOverlay.classList.remove('hidden');
  } else {
    elOverlay.classList.add('hidden');
  }

  // 背景色随最高方块变化
  updateBackground();
}

/* ════════════════════════════════════════════════
   输入处理
   ════════════════════════════════════════════════ */

// ── 键盘 ──────────────────────────────────────────
const KEY_MAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
  A: 'left', D: 'right', W: 'up', S: 'down',
};

document.addEventListener('keydown', e => {
  const dir = KEY_MAP[e.key];
  if (!dir) return;
  e.preventDefault();
  move(dir);
});

// ── 触摸滑动 ──────────────────────────────────────
let touchX0 = null;
let touchY0 = null;
const SWIPE_THRESHOLD = 10; // px

document.addEventListener('touchstart', e => {
  touchX0 = e.touches[0].clientX;
  touchY0 = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  if (touchX0 === null) return;

  const dx = e.changedTouches[0].clientX - touchX0;
  const dy = e.changedTouches[0].clientY - touchY0;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  touchX0 = null;
  touchY0 = null;

  if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

  if (absDx > absDy) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

// ── 按钮 ──────────────────────────────────────────
// 新游戏按钮（游戏结束弹窗中的"再来一局"）
document.getElementById('btn-new-game').addEventListener('click', newGame);

// 覆盖层点击处理（游戏结束或获胜时）
document.getElementById('overlay').addEventListener('click', (e) => {
  // 只有点击覆盖层本身才触发，不触发子元素
  if (e.target === elOverlay) {
    if (state.won && !state.over) {
      // 赢了但棋盘未满 → 继续游戏
      state.keepPlaying = true;
      elOverlay.classList.add('hidden');
    } else {
      newGame();
    }
  }
});

/* ════════════════════════════════════════════════
   滑动动画系统
   ════════════════════════════════════════════════ */

const ANIM_MS = 110; // 过渡时长 (ms)
let animating = false;
let animTimeout = null;

/**
 * 计算棋盘在指定方向移动后，每个方块的来源位置。
 * 返回数组: [{ fromR, fromC, toR, toC, origValue, merged }]
 */
function computeMoveInfo(board, dir) {
  // 每个方向对应的 "transform space → original space" 坐标映射
  const toOrig = {
    left:  (tr, tc) => [tr,     tc],
    right: (tr, tc) => [tr,  3 - tc],
    up:    (tr, tc) => [tc,     tr],
    down:  (tr, tc) => [3 - tc, tr],
  }[dir];

  // 前变换：将棋盘转换为"向左滑"的规范形式
  let pre;
  switch (dir) {
    case 'left':  pre = x => x;                      break;
    case 'right': pre = flipRows;                     break;
    case 'up':    pre = transpose;                    break;
    case 'down':  pre = x => flipRows(transpose(x)); break;
  }

  const transformed = pre(board);
  const info = [];

  transformed.forEach((row, tr) => {
    const nonZero = [];
    row.forEach((v, tc) => { if (v !== 0) nonZero.push({ v, tc }); });

    let destTc = 0;
    let i = 0;
    while (i < nonZero.length) {
      const [fr1, fc1] = toOrig(tr, nonZero[i].tc);
      if (i + 1 < nonZero.length && nonZero[i].v === nonZero[i + 1].v) {
        const [fr2, fc2] = toOrig(tr, nonZero[i + 1].tc);
        const [toR, toC] = toOrig(tr, destTc);
        const val = nonZero[i].v;
        info.push({ fromR: fr1, fromC: fc1, toR, toC, origValue: val, merged: true });
        info.push({ fromR: fr2, fromC: fc2, toR, toC, origValue: val, merged: true });
        i += 2;
      } else {
        const [toR, toC] = toOrig(tr, destTc);
        info.push({ fromR: fr1, fromC: fc1, toR, toC, origValue: nonZero[i].v, merged: false });
        i++;
      }
      destTc++;
    }
  });

  return info;
}

/**
 * 用 transform: translate() 实现平滑滑动，动画结束后调用 render()。
 */
function renderWithAnimation(moveInfo, mergedCells, scoreGained, boardBeforeRandom) {
  animating = true;
  elTiles.innerHTML = '';

  // 1. 将方块放置在最终(TO)位置，但用 transform 偏移到 FROM 位置
  moveInfo.forEach(info => {
    const dr = info.fromR - info.toR;
    const dc = info.fromC - info.toC;

    const el = document.createElement('div');
    el.className = `tile ${tileClass(info.origValue)}`;
    el.textContent = info.origValue;

    const toPos = tilePos(info.toR, info.toC);
    el.style.top  = toPos.top;
    el.style.left = toPos.left;

    // 初始偏移：让方块视觉上位于 FROM 位置
    const tx = dc !== 0 ? `calc(${dc} * (var(--cell-size) + var(--gap)))` : '0px';
    const ty = dr !== 0 ? `calc(${dr} * (var(--cell-size) + var(--gap)))` : '0px';
    if (dr !== 0 || dc !== 0) {
      el.style.transform = `translate(${tx}, ${ty})`;
    }

    elTiles.appendChild(el);
    info._el = el;
  });

  // 2. 下一帧触发过渡：清除偏移 → 方块滑向最终位置
  requestAnimationFrame(() => {
    moveInfo.forEach(info => {
      if (info._el) {
        info._el.style.transition = `transform ${ANIM_MS}ms ease`;
        info._el.style.transform  = '';
      }
    });
  });

  // 3. 动画结束后：最终渲染 + 粒子 + 飘字
  animTimeout = setTimeout(() => {
    animating   = false;
    animTimeout = null;
    prevBoard   = boardBeforeRandom; // 让 render() 正确识别新随机方块
    render(mergedCells);

    // 粒子爆炸（合并格）
    mergedCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      createParticles(r, c, state.board[r][c]);
    });

    // 分数飘字（显示在第一个合并格上方）
    if (scoreGained > 0 && mergedCells.size > 0) {
      const [r, c] = [...mergedCells][0].split(',').map(Number);
      showScorePopup(scoreGained, r, c);
    }
  }, ANIM_MS + 25);
}

/* ════════════════════════════════════════════════
   粒子 & 飘字
   ════════════════════════════════════════════════ */

const TILE_COLORS = {
  2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
  32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
  512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};

function createParticles(r, c, value) {
  const color   = TILE_COLORS[value] || '#3c3a32';
  const count   = Math.min(8, 4 + Math.floor(Math.log2(value) / 2));
  const toP     = tilePos(r, c);
  const centerT = `calc(${toP.top}  + var(--cell-size) * 0.5)`;
  const centerL = `calc(${toP.left} + var(--cell-size) * 0.5)`;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const dist  = 22 + Math.random() * 18;
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      top: ${centerT};
      left: ${centerL};
      background: ${color};
      --tx: ${Math.round(Math.cos(angle) * dist)}px;
      --ty: ${Math.round(Math.sin(angle) * dist)}px;
    `;
    elTiles.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }
}

function showScorePopup(delta, r, c) {
  if (delta <= 0) return;
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = `+${delta}`;
  const pos = tilePos(r, c);
  el.style.top  = pos.top;
  el.style.left = pos.left;
  elTiles.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/* ════════════════════════════════════════════════
   背景色
   ════════════════════════════════════════════════ */

const BG_STEPS = [
  [2048, '#fff0c0'],
  [512,  '#ffdeb0'],
  [128,  '#ffe8d0'],
  [32,   '#fff4e6'],
  [8,    '#fffaf2'],
  [0,    '#faf8ef'],
];

function updateBackground() {
  const maxTile = Math.max(0, ...state.board.flat());
  const bg = (BG_STEPS.find(([thresh]) => maxTile >= thresh) || BG_STEPS[BG_STEPS.length - 1])[1];
  document.body.style.background = bg;
}

/* ════════════════════════════════════════════════
   音效系统（Web Audio API）
   ════════════════════════════════════════════════ */

let audioCtx = null;
let muted    = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur, type = 'sine', vol = 0.25) {
  if (muted) return;
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (_) { /* AudioContext 未就绪时静默失败 */ }
}

function playMove() {
  playTone(210, 0.07, 'triangle', 0.12);
}

function playMerge(value) {
  const freq = 180 + Math.log2(Math.max(value, 2)) * 48;
  playTone(freq, 0.18, 'sine', 0.28);
  setTimeout(() => playTone(freq * 1.5, 0.12, 'sine', 0.16), 55);
}

function playGameOver() {
  [400, 330, 260, 180].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.28, 'sawtooth', 0.18), i * 140)
  );
}

function toggleMute() {
  muted = !muted;
  document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
}

document.getElementById('btn-mute').addEventListener('click', toggleMute);

/* ════════════════════════════════════════════════
   AI 系统（启发式：蛇形权重 + 空格奖励）
   ════════════════════════════════════════════════ */

// 四角蛇形权重矩阵（取最优方向）
const SNAKE_WEIGHTS = [
  [[2048,1024, 512, 256],[ 128,  64,  32,  16],[   8,   4,   2,   1],[0.5,0.25,0.1,0.05]],
  [[ 256, 512,1024,2048],[  16,  32,  64, 128],[   1,   2,   4,   8],[0.05,0.1,0.25,0.5]],
  [[   1,   2,   4,   8],[  16,  32,  64, 128],[ 256, 512,1024,2048],[0.5,0.25,0.1,0.05]],
  [[0.05,0.1,0.25,0.5],[   1,   2,   4,   8],[  16,  32,  64, 128],[ 256, 512,1024,2048]],
];

function evalBoard(board) {
  let empty = 0;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board[r][c] === 0) empty++;

  let bestSnake = -Infinity;
  for (const w of SNAKE_WEIGHTS) {
    let s = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        s += board[r][c] * w[r][c];
    if (s > bestSnake) bestSnake = s;
  }

  return empty * 300 + bestSnake;
}

function getBestMove(board) {
  const dirs = ['up', 'left', 'down', 'right'];
  let bestDir = null, bestScore = -Infinity;
  for (const dir of dirs) {
    const { board: nb, score } = applyMove(board, dir);
    if (boardsEqual(nb, board)) continue;
    const h = evalBoard(nb) + score;
    if (h > bestScore) { bestScore = h; bestDir = dir; }
  }
  return bestDir;
}

// AI 状态
let aiRunning  = false;
let aiInterval = null;

const DIR_LABEL = { left: '⬅ 左', right: '➡ 右', up: '⬆ 上', down: '⬇ 下' };

const elBtnAI    = document.getElementById('btn-ai');
const elAIHint   = document.getElementById('ai-direction');
const elAIStatus = document.getElementById('ai-status');

function aiStep() {
  if (animating) return; // 等待滑动动画
  if (state.over || (state.won && !state.keepPlaying)) { stopAI(); return; }
  const dir = getBestMove(state.board);
  if (dir) {
    elAIHint.textContent = DIR_LABEL[dir];
    move(dir);
  }
}

function startAI() {
  if (aiRunning) return;
  aiRunning = true;
  elBtnAI.textContent = '⏸ 暂停';
  elBtnAI.classList.add('ai-active');
  elAIStatus.hidden = false;
  aiStep();                               // 立即执行一步
  aiInterval = setInterval(aiStep, 200); // 每 200ms 一步
}

function stopAI() {
  clearInterval(aiInterval);
  aiInterval = null;
  aiRunning  = false;
  elBtnAI.textContent = '🤖 AI';
  elBtnAI.classList.remove('ai-active');
  elAIStatus.hidden = true;
  elAIHint.textContent = '';
}

elBtnAI.addEventListener('click', () => { if (aiRunning) stopAI(); else startAI(); });
