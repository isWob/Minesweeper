import { Difficulty, DIFFICULTY_PRESETS } from '../game/types';

export interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}

const LABELS: Record<Difficulty, string> = {
  beginner: '初级',
  intermediate: '中级',
  expert: '高级',
};

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  const difficulties: Difficulty[] = ['beginner', 'intermediate', 'expert'];
  return (
    <div className="difficulty" role="group" aria-label="难度选择">
      {difficulties.map((d) => {
        const cfg = DIFFICULTY_PRESETS[d];
        return (
          <button
            key={d}
            type="button"
            className={`difficulty__btn ${value === d ? 'difficulty__btn--active' : ''}`}
            onClick={() => onChange(d)}
            aria-pressed={value === d}
          >
            {LABELS[d]} · {cfg.rows}×{cfg.cols}
          </button>
        );
      })}
    </div>
  );
}
