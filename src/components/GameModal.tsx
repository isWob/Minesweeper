import { useEffect } from 'react';

export interface GameModalProps {
  open: boolean;
  won: boolean;
  elapsed: number;
  /** 是否创造了新纪录 */
  isNewRecord: boolean;
  onPlayAgain: () => void;
}

function pad3(n: number): string {
  return String(Math.min(999, n)).padStart(3, '0');
}

export function GameModal({ open, won, elapsed, isNewRecord, onPlayAgain }: GameModalProps) {
  // ESC 关闭并重开
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onPlayAgain();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onPlayAgain]);

  if (!open) return null;

  return (
    <div className="modal" aria-hidden={!open} role="dialog" aria-modal="true">
      <div className="modal__panel">
        <div className="modal__icon">{won ? '🎉' : '💥'}</div>
        <h2 className={`modal__title ${won ? 'modal__title--win' : 'modal__title--lose'}`}>
          {won ? '胜利！' : 'boom! 触雷了'}
        </h2>
        <p className="modal__text">
          {won
            ? `用时 ${pad3(elapsed)} 秒${isNewRecord ? ' · 新纪录！' : '，完美通关'}`
            : `坚持了 ${pad3(elapsed)} 秒，再来一局吧`}
        </p>
        <button className="modal__btn" onClick={onPlayAgain} autoFocus>
          再来一局
        </button>
      </div>
    </div>
  );
}
