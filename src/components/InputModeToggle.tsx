/**
 * 触屏输入模式切换（移动端核心交互）
 *
 * 设计动机：长按插旗在不同手机浏览器（微信/X5/iOS Safari）上与系统手势、
 * 页面滚动和合成 click 存在不可控冲突。改为显式模式切换后，轻点格子
 * 必定执行当前模式的动作，可靠性等同于普通按钮点击。
 *
 * - reveal 模式：轻点 = 揭开（桌面端左键的经典行为）
 * - flag   模式：轻点 = 插旗/取消旗
 * 桌面端右键始终插旗，不受模式影响。
 */

export type InputMode = 'reveal' | 'flag';

export interface InputModeToggleProps {
  value: InputMode;
  onChange: (mode: InputMode) => void;
}

export function InputModeToggle({ value, onChange }: InputModeToggleProps) {
  return (
    <div
      className={`input-mode input-mode--${value}`}
      role="group"
      aria-label="操作模式"
    >
      <button
        type="button"
        className={`input-mode__btn ${value === 'reveal' ? 'input-mode__btn--active' : ''}`}
        onClick={() => onChange('reveal')}
        aria-pressed={value === 'reveal'}
      >
        <span className="input-mode__icon" aria-hidden="true">
          ⛏️
        </span>
        <span className="input-mode__label">揭开</span>
      </button>
      <button
        type="button"
        className={`input-mode__btn ${value === 'flag' ? 'input-mode__btn--active' : ''}`}
        onClick={() => onChange('flag')}
        aria-pressed={value === 'flag'}
      >
        <span className="input-mode__icon" aria-hidden="true">
          🚩
        </span>
        <span className="input-mode__label">插旗</span>
      </button>
    </div>
  );
}
