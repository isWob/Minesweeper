import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  gameReducer,
  getMineCount,
  getNeighbors,
  getRemainingSafeCells,
} from '../engine';

// 随机种子相关：测试时通过多次运行覆盖随机性
// 以下测试不依赖具体雷位，只验证不变式。

describe('createInitialState', () => {
  it('各难度参数正确', () => {
    expect(createInitialState('beginner')).toMatchObject({ rows: 9, cols: 9, totalMines: 10 });
    expect(createInitialState('intermediate')).toMatchObject({ rows: 16, cols: 16, totalMines: 40 });
    expect(createInitialState('expert')).toMatchObject({ rows: 16, cols: 30, totalMines: 99 });
  });

  it('初始状态为 ready，未布置地雷，未揭开', () => {
    const s = createInitialState('beginner');
    expect(s.phase).toBe('ready');
    expect(s.firstClickDone).toBe(false);
    expect(s.revealedCount).toBe(0);
    expect(s.flagCount).toBe(0);
    expect(s.elapsed).toBe(0);
    const mines = s.grid.flat().filter((c) => c.mine).length;
    expect(mines).toBe(0);
  });

  it('grid 维度正确，所有格子初始 hidden', () => {
    const s = createInitialState('expert');
    expect(s.grid.length).toBe(16);
    expect(s.grid[0].length).toBe(30);
    for (const row of s.grid) for (const cell of row) expect(cell.status).toBe('hidden');
  });
});

describe('getNeighbors', () => {
  it('中间格 8 邻', () => {
    expect(getNeighbors(5, 5, 10, 10)).toHaveLength(8);
  });
  it('四角 3 邻', () => {
    expect(getNeighbors(0, 0, 10, 10)).toHaveLength(3);
    expect(getNeighbors(0, 9, 10, 10)).toHaveLength(3);
    expect(getNeighbors(9, 0, 10, 10)).toHaveLength(3);
    expect(getNeighbors(9, 9, 10, 10)).toHaveLength(3);
  });
  it('边缘 5 邻', () => {
    expect(getNeighbors(0, 5, 10, 10)).toHaveLength(5);
    expect(getNeighbors(5, 0, 10, 10)).toHaveLength(5);
  });
  it('单格棋盘无邻居', () => {
    expect(getNeighbors(0, 0, 1, 1)).toHaveLength(0);
  });
});

describe('gameReducer - reveal', () => {
  it('首次点击不踩雷：必为安全格且非地雷', () => {
    for (let i = 0; i < 50; i++) {
      const s = createInitialState('beginner');
      const next = gameReducer(s, { type: 'reveal', row: 4, col: 4 });
      expect(next.grid[4][4].mine).toBe(false);
      expect(next.grid[4][4].status).toBe('revealed');
      expect(next.firstClickDone).toBe(true);
      expect(next.phase).not.toBe('lost');
    }
  });

  it('首次点击必开一片：揭开数 >= 1', () => {
    for (let i = 0; i < 50; i++) {
      const s = createInitialState('beginner');
      const next = gameReducer(s, { type: 'reveal', row: 4, col: 4 });
      expect(next.revealedCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('首次点击的八邻必为安全格（不是地雷）', () => {
    for (let i = 0; i < 50; i++) {
      const s = createInitialState('intermediate');
      const next = gameReducer(s, { type: 'reveal', row: 8, col: 8 });
      const neighbors = getNeighbors(8, 8, next.rows, next.cols);
      for (const [nr, nc] of neighbors) {
        expect(next.grid[nr][nc].mine).toBe(false);
      }
    }
  });

  it('地雷布置数等于预设值', () => {
    const s = createInitialState('beginner');
    const next = gameReducer(s, { type: 'reveal', row: 0, col: 0 });
    const mines = next.grid.flat().filter((c) => c.mine).length;
    expect(mines).toBe(10);
  });

  it('对已揭开或已插旗格执行 reveal 无变化', () => {
    const s = createInitialState('beginner');
    const after = gameReducer(s, { type: 'reveal', row: 4, col: 4 });
    // 已揭开格再点无操作
    const noop = gameReducer(after, { type: 'reveal', row: 4, col: 4 });
    expect(noop).toBe(after);
  });

  it('游戏结束后 reveal 无效', () => {
    const s = createInitialState('beginner');
    // 强制构造一个失败状态：揭开所有格中第一个雷
    let state = s;
    // 找一个雷并揭开它（先布置地雷）
    state = gameReducer(state, { type: 'reveal', row: 0, col: 0 });
    // 现在地雷已布置。找一个雷位揭开。
    let mineR = -1,
      mineC = -1;
    for (let r = 0; r < state.rows && mineR < 0; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.grid[r][c].mine && state.grid[r][c].status === 'hidden') {
          mineR = r;
          mineC = c;
          break;
        }
      }
    }
    if (mineR >= 0) {
      const lost = gameReducer(state, { type: 'reveal', row: mineR, col: mineC });
      expect(lost.phase).toBe('lost');
      const noop = gameReducer(lost, { type: 'reveal', row: 0, col: 0 });
      expect(noop).toBe(lost);
    }
  });
});

describe('gameReducer - flag', () => {
  it('隐藏格可插旗/取消，旗数增减', () => {
    const s = createInitialState('beginner');
    const f1 = gameReducer(s, { type: 'flag', row: 0, col: 0 });
    expect(f1.grid[0][0].status).toBe('flagged');
    expect(f1.flagCount).toBe(1);
    const f2 = gameReducer(f1, { type: 'flag', row: 0, col: 0 });
    expect(f2.grid[0][0].status).toBe('hidden');
    expect(f2.flagCount).toBe(0);
  });

  it('已揭开格不能插旗', () => {
    const s = createInitialState('beginner');
    const revealed = gameReducer(s, { type: 'reveal', row: 4, col: 4 });
    const r = revealed.grid.flat().find((c) => c.status === 'revealed')!;
    const rIdx = revealed.grid.flat().indexOf(r);
    const row = Math.floor(rIdx / revealed.cols);
    const col = rIdx % revealed.cols;
    const noop = gameReducer(revealed, { type: 'flag', row, col });
    expect(noop).toBe(revealed);
  });

  it('游戏结束后插旗无效', () => {
    const s = createInitialState('beginner');
    let lost = gameReducer(s, { type: 'reveal', row: 0, col: 0 });
    let mineR = -1,
      mineC = -1;
    for (let r = 0; r < lost.rows && mineR < 0; r++) {
      for (let c = 0; c < lost.cols; c++) {
        if (lost.grid[r][c].mine && lost.grid[r][c].status === 'hidden') {
          mineR = r;
          mineC = c;
          break;
        }
      }
    }
    if (mineR >= 0) {
      lost = gameReducer(lost, { type: 'reveal', row: mineR, col: mineC });
      const before = lost;
      const after = gameReducer(lost, { type: 'flag', row: 0, col: 0 });
      expect(after).toBe(before);
    }
  });
});

describe('gameReducer - tick', () => {
  it('ready/playing 状态下计时器递增', () => {
    const s = createInitialState('beginner');
    const t1 = gameReducer(s, { type: 'tick' });
    expect(t1.elapsed).toBe(1);
    const playing = gameReducer(t1, { type: 'reveal', row: 0, col: 0 });
    const t2 = gameReducer(playing, { type: 'tick' });
    expect(t2.elapsed).toBe(2);
  });
  it('won/lost 状态下计时器不变', () => {
    const s = createInitialState('beginner');
    const lost = { ...s, phase: 'lost' as const };
    const t = gameReducer(lost, { type: 'tick' });
    expect(t.elapsed).toBe(0);
    expect(t).toBe(lost);
  });
});

describe('gameReducer - reset', () => {
  it('reset 重置为初始状态', () => {
    const s = createInitialState('intermediate');
    const after = gameReducer(s, { type: 'reveal', row: 0, col: 0 });
    const reset = gameReducer(after, { type: 'reset' });
    expect(reset.phase).toBe('ready');
    expect(reset.revealedCount).toBe(0);
    expect(reset.flagCount).toBe(0);
    expect(reset.firstClickDone).toBe(false);
    expect(reset.elapsed).toBe(0);
  });
  it('reset 可切换难度', () => {
    const s = createInitialState('beginner');
    const reset = gameReducer(s, { type: 'reset', difficulty: 'expert' });
    expect(reset.difficulty).toBe('expert');
    expect(reset.rows).toBe(16);
    expect(reset.cols).toBe(30);
  });
});

describe('selectors', () => {
  it('getMineCount = totalMines - flagCount', () => {
    const s = createInitialState('intermediate');
    const f = gameReducer(s, { type: 'flag', row: 0, col: 0 });
    expect(getMineCount(f)).toBe(39);
  });
  it('getRemainingSafeCells 计算正确', () => {
    const s = createInitialState('beginner');
    const r = gameReducer(s, { type: 'reveal', row: 0, col: 0 });
    expect(getRemainingSafeCells(r)).toBe(81 - 10 - r.revealedCount);
  });
});

describe('gameReducer - chord', () => {
  it('未揭开格上 chord 无效', () => {
    const s = createInitialState('beginner');
    const noop = gameReducer(s, { type: 'chord', row: 0, col: 0 });
    expect(noop).toBe(s);
  });

  it('数字格周围旗数不匹配时 chord 无操作', () => {
    const s = createInitialState('beginner');
    const revealed = gameReducer(s, { type: 'reveal', row: 0, col: 0 });
    // 找一个已揭开的非零数字格
    const flat = revealed.grid.flat();
    const idx = flat.findIndex((c) => c.status === 'revealed' && c.adjacent > 0);
    if (idx >= 0) {
      const row = Math.floor(idx / revealed.cols);
      const col = idx % revealed.cols;
      const before = revealed;
      const after = gameReducer(revealed, { type: 'chord', row, col });
      // 周围无旗，旗数(0) != adjacent(>0)，应无操作
      expect(after).toBe(before);
    }
  });
});

describe('胜利路径', () => {
  it('揭开所有安全格后状态变为 won，所有雷自动插旗', () => {
    // 用最小自定义难度（通过 reset 后构造）—— 直接用 beginner 全揭开
    const s = createInitialState('beginner');
    // 揭开一个起点
    let state = gameReducer(s, { type: 'reveal', row: 4, col: 4 });
    // 揭开剩余 hidden 安全格
    let guard = 0;
    while (state.phase !== 'won' && state.phase !== 'lost' && guard < 1000) {
      guard++;
      // 找一个 hidden 安全格揭开
      let revealed = false;
      for (let r = 0; r < state.rows && !revealed; r++) {
        for (let c = 0; c < state.cols; c++) {
          const cell = state.grid[r][c];
          if (cell.status === 'hidden' && !cell.mine) {
            state = gameReducer(state, { type: 'reveal', row: r, col: c });
            revealed = true;
            break;
          }
        }
      }
      if (!revealed) break;
    }
    expect(state.phase).toBe('won');
    // 所有雷应自动插旗
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell.mine) expect(cell.status).toBe('flagged');
      }
    }
  });
});
