/**
 * useMinesweeper —— 扫雷引擎的 React 封装
 *
 * 职责：
 * 1. 持有 GameState，通过 dispatch 派发动作
 * 2. 自动启停计时器：playing 状态下每秒 tick
 * 3. 胜负时刻回调，便于上层做弹窗、记录最佳成绩
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createInitialState, gameReducer } from '../game/engine';
import { Difficulty, GameAction } from '../game/types';

const TICK_MS = 1000;

export interface UseMinesweeperResult {
  state: ReturnType<typeof createInitialState>;
  dispatch: (action: GameAction) => void;
  /** 切换难度并开始新局 */
  newGame: (difficulty?: Difficulty) => void;
}

export function useMinesweeper(initial: Difficulty = 'intermediate'): UseMinesweeperResult {
  const [state, dispatch] = useReducer(gameReducer, initial, createInitialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计时器启停：phase ∈ {ready, playing} 且 firstClickDone 时启动
  useEffect(() => {
    const shouldRun = state.phase === 'ready' || state.phase === 'playing';
    if (shouldRun && timerRef.current === null) {
      // 仅在首次点击之后才真正开始计时
      if (state.firstClickDone || state.phase === 'playing') {
        timerRef.current = setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
      }
    } else if (!shouldRun && timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, state.firstClickDone]);

  const newGame = useCallback((difficulty?: Difficulty) => {
    dispatch({ type: 'reset', difficulty });
  }, []);

  return { state, dispatch, newGame };
}
