import { describe, expect, it, beforeEach } from 'vitest';
import {
  BestTimes,
  isHighScore,
  loadBestTimes,
  saveBestTimes,
  submitScore,
} from '../bestTimes';
import { Difficulty } from '../../game/types';

// 模拟 localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
});

describe('loadBestTimes', () => {
  it('空 localStorage 返回空结构', () => {
    const t = loadBestTimes();
    expect(t.beginner).toEqual([]);
    expect(t.intermediate).toEqual([]);
    expect(t.expert).toEqual([]);
  });
  it('已存数据正常解析', () => {
    saveBestTimes({
      beginner: [{ time: 10, date: '2026-01-01' }],
      intermediate: [],
      expert: [],
    });
    const t = loadBestTimes();
    expect(t.beginner).toEqual([{ time: 10, date: '2026-01-01' }]);
  });
  it('损坏的 JSON 容错返回空', () => {
    store['minesweeper.bestTimes.v1'] = '{not json';
    const t = loadBestTimes();
    expect(t.beginner).toEqual([]);
  });
});

describe('submitScore', () => {
  it('空榜直接加入', () => {
    const t = submitScore(loadBestTimes(), 'beginner', 30);
    expect(t.beginner).toEqual([{ time: 30, date: expect.any(String) }]);
  });
  it('按时间升序保留前 3', () => {
    let t: BestTimes = loadBestTimes();
    t = submitScore(t, 'beginner', 50);
    t = submitScore(t, 'beginner', 20);
    t = submitScore(t, 'beginner', 40);
    t = submitScore(t, 'beginner', 10);
    expect(t.beginner.map((e) => e.time)).toEqual([10, 20, 40]);
  });
  it('不达标的成绩不入榜', () => {
    let t: BestTimes = loadBestTimes();
    t = submitScore(t, 'beginner', 10);
    t = submitScore(t, 'beginner', 20);
    t = submitScore(t, 'beginner', 30);
    t = submitScore(t, 'beginner', 40); // 比第3名(30)慢，不入榜
    expect(t.beginner.map((e) => e.time)).toEqual([10, 20, 30]);
  });
  it('不同难度独立', () => {
    let t = loadBestTimes();
    t = submitScore(t, 'beginner', 10);
    t = submitScore(t, 'expert', 99);
    expect(t.beginner.map((e) => e.time)).toEqual([10]);
    expect(t.expert.map((e) => e.time)).toEqual([99]);
  });
});

describe('isHighScore', () => {
  it('空榜任何成绩都算新高分', () => {
    expect(isHighScore(loadBestTimes(), 'beginner', 999)).toBe(true);
  });
  it('榜未满 3 人任何成绩算新高分', () => {
    let t = submitScore(loadBestTimes(), 'beginner', 10);
    t = submitScore(t, 'beginner', 20);
    expect(isHighScore(t, 'beginner', 999)).toBe(true);
  });
  it('榜满 3 人后必须快于最慢才算', () => {
    let t = loadBestTimes();
    t = submitScore(t, 'beginner', 10);
    t = submitScore(t, 'beginner', 20);
    t = submitScore(t, 'beginner', 30);
    expect(isHighScore(t, 'beginner', 30)).toBe(false);
    expect(isHighScore(t, 'beginner', 29)).toBe(true);
  });
});

describe('难度参数类型', () => {
  it('所有难度都能存取', () => {
    const ds: Difficulty[] = ['beginner', 'intermediate', 'expert'];
    let t = loadBestTimes();
    for (const d of ds) t = submitScore(t, d, 50);
    const loaded = loadBestTimes();
    saveBestTimes(t);
    const reloaded = loadBestTimes();
    for (const d of ds) expect(reloaded[d].length).toBe(1);
    void loaded;
  });
});
