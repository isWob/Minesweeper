/**
 * 扫雷核心引擎 —— 纯函数实现，无副作用，完全可测试。
 *
 * 关键不变式：
 * 1. 首次点击前不布置地雷，保证开局不直接踩雷。
 * 2. 首次点击格及其八邻必为安全格，确保开局必开一片空白。
 * 3. 所有状态变更通过 reducer 模式：原状态 + 动作 -> 新状态。
 */

import {
  Cell,
  DIFFICULTY_PRESETS,
  Difficulty,
  GameAction,
  GameState,
} from './types';

// ===== 工厂 =====

export function createInitialState(difficulty: Difficulty = 'intermediate'): GameState {
  const cfg = DIFFICULTY_PRESETS[difficulty];
  return {
    difficulty,
    rows: cfg.rows,
    cols: cfg.cols,
    totalMines: cfg.mines,
    grid: createEmptyGrid(cfg.rows, cfg.cols),
    revealedCount: 0,
    flagCount: 0,
    firstClickDone: false,
    phase: 'ready',
    elapsed: 0,
  };
}

function createEmptyGrid(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ mine: false, adjacent: 0, status: 'hidden', exploded: false, wrong: false });
    }
    grid.push(row);
  }
  return grid;
}

// ===== 邻居枚举 =====

export function getNeighbors(row: number, col: number, rows: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        out.push([nr, nc]);
      }
    }
  }
  return out;
}

// ===== 地雷布置（带安全区） =====

/**
 * 在 grid 上布置 mines 颗地雷，避开 (safeRow, safeCol) 及其八邻。
 * 同时重算邻接计数。
 *
 * 使用 Fisher-Yates 部分洗牌选取雷位 —— O(N) 时间，N = rows*cols。
 */
function placeMines(grid: Cell[][], rows: number, cols: number, mines: number, safeRow: number, safeCol: number): void {
  const total = rows * cols;
  // 禁区：首次点击格及其八邻，保证开局必开一片
  const forbidden = new Set<number>();
  forbidden.add(safeRow * cols + safeCol);
  for (const [nr, nc] of getNeighbors(safeRow, safeCol, rows, cols)) {
    forbidden.add(nr * cols + nc);
  }

  // 候选位：所有非禁区格的索引
  const candidates: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!forbidden.has(i)) candidates.push(i);
  }
  // 部分洗牌前 mines 个位置
  const minesToPlace = Math.min(mines, candidates.length);
  for (let i = 0; i < minesToPlace; i++) {
    const j = i + Math.floor(Math.random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    const idx = candidates[i];
    grid[Math.floor(idx / cols)][idx % cols].mine = true;
  }

  // 重算邻接数
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        if (grid[nr][nc].mine) count++;
      }
      grid[r][c].adjacent = count;
    }
  }
}

// ===== 不可变工具：深拷贝 grid =====

function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

// ===== 揭开逻辑（洪水填充） =====

/**
 * 在指定格上揭开，返回新状态。原地雷未布置时先布置。
 * 命中地雷 → lost；揭开安全格 → 累计 revealedCount，触发洪水填充，
 * 直至所有空白（adjacent=0）格的边界全部揭开。
 */
function reveal(state: GameState, row: number, col: number): GameState {
  if (state.phase === 'won' || state.phase === 'lost') return state;

  const cell = state.grid[row][col];
  if (cell.status !== 'hidden') return state; // 已揭开或已插旗

  // 复制 grid 用于不可变更新
  const grid = cloneGrid(state.grid);
  let revealedCount = state.revealedCount;
  let firstClickDone = state.firstClickDone;

  // 首次点击：布置地雷
  if (!firstClickDone) {
    placeMines(grid, state.rows, state.cols, state.totalMines, row, col);
    firstClickDone = true;
  }

  // 命中地雷 → 失败
  if (grid[row][col].mine) {
    grid[row][col].status = 'revealed';
    grid[row][col].exploded = true;
    // 揭开所有地雷，标记错误旗
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cc = grid[r][c];
        if (cc.mine && cc.status === 'hidden') {
          cc.status = 'revealed';
        } else if (!cc.mine && cc.status === 'flagged') {
          cc.wrong = true;
          cc.status = 'revealed';
        }
      }
    }
    return { ...state, grid, revealedCount, firstClickDone, phase: 'lost' };
  }

  // 安全格：洪水填充揭开
  const stack: Array<[number, number]> = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const cur = grid[r][c];
    if (cur.status !== 'hidden') continue;
    cur.status = 'revealed';
    revealedCount++;
    if (cur.adjacent === 0) {
      for (const [nr, nc] of getNeighbors(r, c, state.rows, state.cols)) {
        const n = grid[nr][nc];
        if (n.status === 'hidden' && !n.mine) {
          stack.push([nr, nc]);
        }
      }
    }
  }

  // 胜利判定
  const safeTotal = state.rows * state.cols - state.totalMines;
  const phase = revealedCount >= safeTotal ? 'won' : 'playing';
  // 胜利时自动给所有未旗雷补旗
  if (phase === 'won') {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cc = grid[r][c];
        if (cc.mine && cc.status !== 'flagged') {
          cc.status = 'flagged';
        }
      }
    }
  }

  return { ...state, grid, revealedCount, firstClickDone, phase };
}

// ===== 插旗 =====

function toggleFlag(state: GameState, row: number, col: number): GameState {
  if (state.phase === 'won' || state.phase === 'lost') return state;
  const cell = state.grid[row][col];
  if (cell.status === 'revealed') return state;

  const grid = cloneGrid(state.grid);
  const target = grid[row][col];
  let flagCount = state.flagCount;
  if (target.status === 'hidden') {
    target.status = 'flagged';
    flagCount++;
  } else {
    target.status = 'hidden';
    flagCount--;
  }
  return { ...state, grid, flagCount };
}

// ===== 和弦（chord）=====
// 当玩家点击一个已揭开的数字格，且其周围旗数 == 数字时，
// 自动揭开该数字格周围所有未旗格。

function chord(state: GameState, row: number, col: number): GameState {
  if (state.phase !== 'playing' && state.phase !== 'ready') return state;
  const cell = state.grid[row][col];
  if (cell.status !== 'revealed' || cell.adjacent === 0) return state;

  // 统计周围旗数
  let flagCount = 0;
  for (const [nr, nc] of getNeighbors(row, col, state.rows, state.cols)) {
    if (state.grid[nr][nc].status === 'flagged') flagCount++;
  }
  if (flagCount !== cell.adjacent) return state;

  // 揭开周围所有未旗格 —— 顺序揭开，命中地雷即止
  let next: GameState = state;
  for (const [nr, nc] of getNeighbors(row, col, state.rows, state.cols)) {
    if (next.grid[nr][nc].status === 'hidden') {
      next = reveal(next, nr, nc);
      if (next.phase === 'lost') break;
    }
  }
  return next;
}

// ===== 主 reducer =====

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'reveal':
      return reveal(state, action.row, action.col);
    case 'flag':
      return toggleFlag(state, action.row, action.col);
    case 'chord':
      return chord(state, action.row, action.col);
    case 'tick':
      if (state.phase === 'playing' || state.phase === 'ready') {
        return { ...state, elapsed: state.elapsed + 1 };
      }
      return state;
    case 'reset':
      return createInitialState(action.difficulty ?? state.difficulty);
    default: {
      // exhaustiveness check：未匹配的动作视为无操作
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

// ===== 选择器（派生数据）=====

export function getMineCount(state: GameState): number {
  return state.totalMines - state.flagCount;
}

export function getRemainingSafeCells(state: GameState): number {
  return state.rows * state.cols - state.totalMines - state.revealedCount;
}
