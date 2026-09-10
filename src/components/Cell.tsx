import { memo, useEffect, useRef } from 'react';
import { Cell as CellModel } from '../game/types';

/** 长按阈值：按住达到该时长立即插旗并震动，之后继续按住不会取消 */
const LONG_PRESS_MS = 350;
/** 位移容差(px)：手指轻微抖动不取消长按，超过该距离才判定为滑动而取消 */
const MOVE_TOLERANCE_PX = 10;
/** 合成 click 抑制标志的兜底清除时间，防止极端情况下标志残留吃掉下一次点击 */
const SUPPRESS_TTL_MS = 700;

export interface CellProps {
  /** 行索引（0-based） */
  row: number;
  /** 列索引（0-based） */
  col: number;
  /** 格子数据 */
  cell: CellModel;
  /** 当前是否为插旗模式（flag 模式下轻点即插旗，不揭开） */
  flagMode: boolean;
  /** 左键揭开 */
  onReveal: (row: number, col: number) => void;
  /** 右键插旗 */
  onFlag: (row: number, col: number) => void;
  /** 左键和弦（数字格点击） */
  onChord: (row: number, col: number) => void;
  /** 按下/抬起 —— 用于驱动表情反馈 */
  onPressingChange: (pressing: boolean) => void;
}

/** 单元格类名生成 */
function cellClassName(cell: CellModel): string {
  const classes = ['cell'];
  if (cell.status === 'flagged') classes.push('cell--flagged');
  if (cell.status === 'revealed') {
    classes.push('cell--revealed');
    if (cell.mine) {
      classes.push('cell--mine');
      if (cell.exploded) classes.push('cell--mine--exploded');
    } else if (cell.adjacent > 0) {
      classes.push(`cell--num-${cell.adjacent}`);
    }
    if (cell.wrong) classes.push('cell--wrong');
  }
  return classes.join(' ');
}

function cellText(cell: CellModel): string {
  if (cell.status === 'flagged') return '';
  if (cell.status !== 'revealed') return '';
  if (cell.mine) return '';
  return cell.adjacent > 0 ? String(cell.adjacent) : '';
}

export const Cell = memo(function Cell({
  row,
  col,
  cell,
  flagMode,
  onReveal,
  onFlag,
  onChord,
  onPressingChange,
}: CellProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // 长按触发后吞掉 touchend 派发的合成 click，避免插旗/取消旗后又被揭开
  const suppressClickRef = useRef(false);

  // 单击（也是触屏轻点合成 click 的唯一业务入口，行为由当前模式决定）
  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (flagMode) {
      // 插旗模式：轻点即插旗/取消旗（已揭开格由引擎安全忽略）
      onFlag(row, col);
      return;
    }
    if (cell.status === 'revealed' && cell.adjacent > 0) {
      onChord(row, col);
    } else {
      onReveal(row, col);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onFlag(row, col);
  };

  /**
   * 触屏手势状态机（原生非 passive 监听，单次触摸周期严格边沿触发一次）：
   * - touchstart：记录起点；仅"揭开模式"下启动长按定时器
   *   （插旗模式轻点即插旗，无需长按，避免重复触发）
   * - 触摸中移动超过容差：判定为滑动（如滚动棋盘），取消长按
   * - 达到 LONG_PRESS_MS（手指仍按着）：立即快捷插旗 + 震动反馈；
   *   之后继续按住多久都保持该结果，不会重复触发
   * - touchend：若长按已触发，阻止默认行为以吞掉合成 click；
   *   短按则放行，由合成 click 按当前模式执行
   */
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let suppressResetTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let longPressed = false;

    const clearLongPressTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      longPressed = false;
      onPressingChange(true);
      clearLongPressTimer();
      // 插旗模式下轻点即插旗，长按快捷方式不启用
      if (flagMode) return;
      timer = setTimeout(() => {
        timer = null;
        longPressed = true;
        suppressClickRef.current = true;
        onFlag(row, col);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
      }, LONG_PRESS_MS);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (timer === null) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      // 超过容差才取消，手指微抖不影响长按
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
        clearLongPressTimer();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      clearLongPressTimer();
      onPressingChange(false);
      if (longPressed) {
        // 非 passive：阻止 touchend 默认行为，吞掉后续合成 click
        e.preventDefault();
        if (suppressResetTimer) clearTimeout(suppressResetTimer);
        // 兜底：即使某些浏览器不派发合成 click，也保证标志不会残留
        suppressResetTimer = setTimeout(() => {
          suppressClickRef.current = false;
        }, SUPPRESS_TTL_MS);
      }
    };

    const handleTouchCancel = () => {
      clearLongPressTimer();
      longPressed = false;
      onPressingChange(false);
    };

    // touchend 必须非 passive 才能 preventDefault
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      clearLongPressTimer();
      if (suppressResetTimer) clearTimeout(suppressResetTimer);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [row, col, flagMode, onFlag, onPressingChange]);

  // 键盘可达性：F 插旗，空格/回车揭开
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      onFlag(row, col);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  // 插旗模式下未揭开格加视觉提示（红色悬停态），明确告知当前轻点动作
  const modeClass =
    flagMode && cell.status === 'hidden' && !cell.mine ? ' cell--flag-mode' : '';

  return (
    <button
      ref={buttonRef}
      type="button"
      className={cellClassName(cell) + modeClass}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={() => onPressingChange(true)}
      onMouseUp={() => onPressingChange(false)}
      onMouseLeave={() => onPressingChange(false)}
      onKeyDown={handleKeyDown}
      aria-label={`格子 ${row + 1}, ${col + 1}${flagMode ? '（插旗模式）' : ''}`}
    >
      {cellText(cell)}
    </button>
  );
});
