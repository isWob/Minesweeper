import { useCallback, useEffect, useRef, useState } from 'react';
import { Board } from './components/Board';
import { DifficultySelector } from './components/DifficultySelector';
import { GameModal } from './components/GameModal';
import { BestTimesPanel } from './components/BestTimesPanel';
import { InputModeToggle, InputMode } from './components/InputModeToggle';
import { Toolbar } from './components/Toolbar';
import { useMinesweeper } from './hooks/useMinesweeper';
import { getMineCount } from './game/engine';
import { Difficulty } from './game/types';
import {
  BestTimes,
  isHighScore,
  loadBestTimes,
  saveBestTimes,
  submitScore,
} from './storage/bestTimes';

const INPUT_MODE_KEY = 'minesweeper.inputMode.v1';

function loadInputMode(): InputMode {
  if (typeof window === 'undefined') return 'reveal';
  return window.localStorage.getItem(INPUT_MODE_KEY) === 'flag' ? 'flag' : 'reveal';
}

export default function App() {
  const { state, dispatch, newGame } = useMinesweeper('intermediate');
  const [pressing, setPressing] = useState(false);
  const [best, setBest] = useState<BestTimes>(() => loadBestTimes());
  const [isNewRecord, setIsNewRecord] = useState(false);
  // 触屏操作模式（持久化，记住用户偏好）
  const [inputMode, setInputMode] = useState<InputMode>(() => loadInputMode());
  // 用于触发胜负一次性副作用，避免在渲染中提交成绩
  const lastPhaseRef = useRef(state.phase);

  useEffect(() => {
    try {
      window.localStorage.setItem(INPUT_MODE_KEY, inputMode);
    } catch {
      // 隐私模式等场景忽略
    }
  }, [inputMode]);

  // 胜负时刻：提交成绩
  useEffect(() => {
    const prev = lastPhaseRef.current;
    if (prev !== state.phase && state.phase === 'won') {
      if (isHighScore(best, state.difficulty, state.elapsed)) {
        const updated = submitScore(best, state.difficulty, state.elapsed);
        setBest(updated);
        saveBestTimes(updated);
        setIsNewRecord(true);
      } else {
        setIsNewRecord(false);
      }
    } else if (state.phase === 'playing' || state.phase === 'ready') {
      setIsNewRecord(false);
    }
    lastPhaseRef.current = state.phase;
  }, [state.phase, state.elapsed, state.difficulty, best]);

  // 难度切换 = 新游戏
  const handleDifficulty = useCallback(
    (d: Difficulty) => {
      newGame(d);
    },
    [newGame],
  );

  const handleReveal = useCallback(
    (row: number, col: number) => dispatch({ type: 'reveal', row, col }),
    [dispatch],
  );
  const handleFlag = useCallback(
    (row: number, col: number) => dispatch({ type: 'flag', row, col }),
    [dispatch],
  );
  const handleChord = useCallback(
    (row: number, col: number) => dispatch({ type: 'chord', row, col }),
    [dispatch],
  );

  const handleReset = useCallback(() => {
    newGame();
  }, [newGame]);

  const modalOpen = state.phase === 'won' || state.phase === 'lost';

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="title">扫雷</h1>
        <p className="subtitle">Minesweeper · React + TypeScript</p>
      </header>

      <main className="game">
        <DifficultySelector value={state.difficulty} onChange={handleDifficulty} />

        <Toolbar
          mineCount={getMineCount(state)}
          elapsed={state.elapsed}
          phase={state.phase}
          pressing={pressing}
          onReset={handleReset}
        />

        <InputModeToggle value={inputMode} onChange={setInputMode} />

        <div className={`board-wrap board-wrap--${inputMode}`}>
          <Board
            rows={state.rows}
            cols={state.cols}
            grid={state.grid}
            flagMode={inputMode === 'flag'}
            onReveal={handleReveal}
            onFlag={handleFlag}
            onChord={handleChord}
            onPressingChange={setPressing}
          />
        </div>

        <p className="hint" aria-live="polite">
          {inputMode === 'flag'
            ? '🚩 插旗模式：轻点格子插旗/取消旗 · 切回「揭开」模式继续挖雷'
            : '⛏️ 揭开模式：轻点挖雷 · 切换「插旗」模式或长按格子插旗 · 数字格点击和弦'}
        </p>
      </main>

      <BestTimesPanel best={best} />

      <GameModal
        open={modalOpen}
        won={state.phase === 'won'}
        elapsed={state.elapsed}
        isNewRecord={isNewRecord}
        onPlayAgain={handleReset}
      />

      <footer className="app__footer">
        <span>React + TypeScript + Vite · 工业级实现</span>
      </footer>
    </div>
  );
}
