import { Cell as CellModel } from '../game/types';
import { Cell } from './Cell';

export interface BoardProps {
  rows: number;
  cols: number;
  grid: CellModel[][];
  /** 插旗模式：轻点格子执行插旗而非揭开 */
  flagMode: boolean;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
  onPressingChange: (pressing: boolean) => void;
}

export function Board({
  rows,
  cols,
  grid,
  flagMode,
  onReveal,
  onFlag,
  onChord,
  onPressingChange,
}: BoardProps) {
  return (
    <div
      className="board"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
      role="grid"
      aria-label="扫雷棋盘"
    >
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`${r}-${c}`}
            row={r}
            col={c}
            cell={cell}
            flagMode={flagMode}
            onReveal={onReveal}
            onFlag={onFlag}
            onChord={onChord}
            onPressingChange={onPressingChange}
          />
        )),
      )}
    </div>
  );
}
