import { memo } from 'react';
import { Cell as CellModel } from '../game/types';

export interface CellProps {
  /** 行索引（0-based） */
  row: number;
  /** 列索引（0-based） */
  col: number;
  /** 格子数据 */
  cell: CellModel;
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
  onReveal,
  onFlag,
  onChord,
  onPressingChange,
}: CellProps) {
  const handleClick = () => {
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

  // 触屏长按插旗
  let touchTimer: ReturnType<typeof setTimeout> | null = null;
  let touched = false;
  const handleTouchStart = () => {
    touched = true;
    onPressingChange(true);
    touchTimer = setTimeout(() => {
      if (touched) {
        onFlag(row, col);
        touched = false;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    }, 350);
  };
  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    touched = false;
    onPressingChange(false);
  };
  const handleTouchMove = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    touched = false;
    onPressingChange(false);
  };

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

  return (
    <button
      type="button"
      className={cellClassName(cell)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={() => onPressingChange(true)}
      onMouseUp={() => onPressingChange(false)}
      onMouseLeave={() => onPressingChange(false)}
      onKeyDown={handleKeyDown}
      aria-label={`格子 ${row + 1}, ${col + 1}`}
    >
      {cellText(cell)}
    </button>
  );
});
