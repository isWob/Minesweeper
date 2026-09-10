import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cell } from '../Cell';
import { Cell as CellModel } from '../../game/types';

const hiddenCell: CellModel = {
  mine: false,
  adjacent: 0,
  status: 'hidden',
  exploded: false,
  wrong: false,
};

const numberCell: CellModel = {
  mine: false,
  adjacent: 2,
  status: 'revealed',
  exploded: false,
  wrong: false,
};

function renderCell(cell: CellModel, flagMode = false) {
  const onReveal = vi.fn();
  const onFlag = vi.fn();
  const onChord = vi.fn();
  const onPressingChange = vi.fn();
  render(
    <Cell
      row={1}
      col={2}
      cell={cell}
      flagMode={flagMode}
      onReveal={onReveal}
      onFlag={onFlag}
      onChord={onChord}
      onPressingChange={onPressingChange}
    />,
  );
  const button = screen.getByRole('button');
  return { button, onReveal, onFlag, onChord, onPressingChange };
}

describe('Cell 点击分派（模式行为）', () => {
  it('揭开模式：点隐藏格 → onReveal', () => {
    const { button, onReveal, onFlag } = renderCell(hiddenCell, false);
    fireEvent.click(button);
    expect(onReveal).toHaveBeenCalledWith(1, 2);
    expect(onFlag).not.toHaveBeenCalled();
  });

  it('插旗模式：点隐藏格 → onFlag（不揭开）', () => {
    const { button, onReveal, onFlag } = renderCell(hiddenCell, true);
    fireEvent.click(button);
    expect(onFlag).toHaveBeenCalledWith(1, 2);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('揭开模式：点已揭开的数字格 → onChord', () => {
    const { button, onChord, onReveal } = renderCell(numberCell, false);
    fireEvent.click(button);
    expect(onChord).toHaveBeenCalledWith(1, 2);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('插旗模式：点已揭开格 → 走 onFlag（引擎对已揭开格安全忽略，不报错）', () => {
    const { button, onFlag } = renderCell(numberCell, true);
    fireEvent.click(button);
    expect(onFlag).toHaveBeenCalledWith(1, 2);
  });
});

describe('Cell 右键', () => {
  it('揭开模式下右键始终插旗并阻止默认菜单', () => {
    const { button, onFlag, onReveal } = renderCell(hiddenCell, false);
    fireEvent.contextMenu(button);
    expect(onFlag).toHaveBeenCalledWith(1, 2);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('插旗模式下右键同样插旗（行为一致）', () => {
    const { button, onFlag } = renderCell(hiddenCell, true);
    fireEvent.contextMenu(button);
    expect(onFlag).toHaveBeenCalledWith(1, 2);
  });
});

describe('Cell 键盘', () => {
  it('F 键插旗', () => {
    const { button, onFlag } = renderCell(hiddenCell, false);
    fireEvent.keyDown(button, { key: 'f' });
    expect(onFlag).toHaveBeenCalledWith(1, 2);
  });

  it('空格在插旗模式下执行插旗', () => {
    const { button, onFlag, onReveal } = renderCell(hiddenCell, true);
    fireEvent.keyDown(button, { key: ' ' });
    expect(onFlag).toHaveBeenCalledWith(1, 2);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('回车在揭开模式下揭开', () => {
    const { button, onReveal } = renderCell(hiddenCell, false);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onReveal).toHaveBeenCalledWith(1, 2);
  });
});
