/**
 * 扫雷核心类型定义
 *
 * 设计原则：所有状态用单一 GameState 表达，引擎操作为纯函数 (state, action) -> state，
 * 便于测试、撤销/重做、以及 React 的不可变更新模型。
 */

export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

export type CellStatus = 'hidden' | 'revealed' | 'flagged';

export interface Cell {
  /** 是否为地雷 */
  mine: boolean;
  /** 周围 8 邻格的地雷数 */
  adjacent: number;
  /** 当前状态 */
  status: CellStatus;
  /** 触雷标记，仅当本格被点击引爆时为 true */
  exploded: boolean;
  /** 错误标记：非雷却插旗，游戏失败后用于显示打叉 */
  wrong: boolean;
}

export type GamePhase = 'ready' | 'playing' | 'won' | 'lost';

export interface GameState {
  difficulty: Difficulty;
  rows: number;
  cols: number;
  totalMines: number;
  /** 二维网格，grid[r][c] */
  grid: Cell[][];
  /** 已揭开的安全格数（不含地雷） */
  revealedCount: number;
  /** 已插旗数 */
  flagCount: number;
  /** 首次点击是否已发生（决定地雷是否已布置） */
  firstClickDone: boolean;
  phase: GamePhase;
  /** 游戏用时（秒），由外部计时器累加并更新 */
  elapsed: number;
}

/** 引擎可执行的玩家动作 */
export type GameAction =
  | { type: 'reveal'; row: number; col: number }
  | { type: 'flag'; row: number; col: number }
  | { type: 'chord'; row: number; col: number }
  | { type: 'tick' }
  | { type: 'reset'; difficulty?: Difficulty };
