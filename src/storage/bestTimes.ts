/**
 * 最佳成绩持久化 —— localStorage 封装
 *
 * 数据模型：每个难度保留 Top 3 最快时间。胜负判定由调用方决定。
 * 本模块只负责读写，不包含游戏逻辑。
 */

import { Difficulty } from '../game/types';

const STORAGE_KEY = 'minesweeper.bestTimes.v1';

export interface ScoreEntry {
  /** 用时（秒） */
  time: number;
  /** 完成时间戳（ISO） */
  date: string;
}

export type BestTimes = Record<Difficulty, ScoreEntry[]>;

const EMPTY: BestTimes = {
  beginner: [],
  intermediate: [],
  expert: [],
};

const MAX_PER_DIFFICULTY = 3;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadBestTimes(): BestTimes {
  if (!isBrowser()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<BestTimes>;
    return {
      beginner: Array.isArray(parsed.beginner) ? parsed.beginner : [],
      intermediate: Array.isArray(parsed.intermediate) ? parsed.intermediate : [],
      expert: Array.isArray(parsed.expert) ? parsed.expert : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveBestTimes(times: BestTimes): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
  } catch {
    // 容量满或隐私模式：忽略
  }
}

/**
 * 提交一条成绩，返回更新后的 BestTimes。
 * 自动按时间升序保留前 MAX_PER_DIFFICULTY 名。
 */
export function submitScore(
  times: BestTimes,
  difficulty: Difficulty,
  time: number,
  date: Date = new Date(),
): BestTimes {
  const entry: ScoreEntry = { time, date: date.toISOString() };
  const list = [...(times[difficulty] ?? []), entry];
  list.sort((a, b) => a.time - b.time);
  const trimmed = list.slice(0, MAX_PER_DIFFICULTY);
  return { ...times, [difficulty]: trimmed };
}

export function isHighScore(times: BestTimes, difficulty: Difficulty, time: number): boolean {
  const list = times[difficulty] ?? [];
  if (list.length < MAX_PER_DIFFICULTY) return true;
  return time < list[list.length - 1].time;
}
