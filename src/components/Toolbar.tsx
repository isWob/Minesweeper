import { GamePhase } from '../game/types';

export interface ToolbarProps {
  /** 剩余雷数 = 总雷数 - 旗数 */
  mineCount: number;
  /** 用时（秒） */
  elapsed: number;
  /** 游戏阶段，用于切换表情 */
  phase: GamePhase;
  /** 是否处于按压（露出惊讶脸） */
  pressing: boolean;
  onReset: () => void;
}

const FACES: Record<GamePhase, string> = {
  ready: '🙂',
  playing: '🙂',
  won: '😎',
  lost: '😵',
};

function pad3(n: number): string {
  if (n < 0) return '-' + String(Math.min(99, -n)).padStart(2, '0');
  return String(Math.min(999, n)).padStart(3, '0');
}

export function Toolbar({ mineCount, elapsed, phase, pressing, onReset }: ToolbarProps) {
  const face = pressing && phase !== 'won' && phase !== 'lost' ? '😮' : FACES[phase];

  return (
    <div className="game__toolbar">
      <div className="counter counter--mines" title="剩余地雷数">
        <span className="counter__icon">💣</span>
        <span className="counter__value">{pad3(mineCount)}</span>
      </div>

      <button
        className="reset-btn"
        onClick={onReset}
        title="重新开始"
        aria-label="重新开始"
      >
        <span className="reset-btn__face">{face}</span>
      </button>

      <div className="counter counter--time" title="用时">
        <span className="counter__icon">⏱</span>
        <span className="counter__value">{pad3(elapsed)}</span>
      </div>
    </div>
  );
}
