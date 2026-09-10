import { BestTimes } from '../storage/bestTimes';
import { Difficulty, DIFFICULTY_PRESETS } from '../game/types';

export interface BestTimesPanelProps {
  best: BestTimes;
}

const LABELS: Record<Difficulty, string> = {
  beginner: '初级',
  intermediate: '中级',
  expert: '高级',
};

function formatTime(time: number): string {
  const m = Math.floor(time / 60);
  const s = time % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BestTimesPanel({ best }: BestTimesPanelProps) {
  const difficulties: Difficulty[] = ['beginner', 'intermediate', 'expert'];

  return (
    <div className="best-times" aria-label="最佳成绩榜">
      <h3 className="best-times__title">🏆 最佳成绩</h3>
      <div className="best-times__grid">
        {difficulties.map((d) => {
          const list = best[d] ?? [];
          const cfg = DIFFICULTY_PRESETS[d];
          return (
            <div key={d} className="best-times__col">
              <div className="best-times__col-title">
                {LABELS[d]} <span className="best-times__col-meta">{cfg.mines}雷</span>
              </div>
              {list.length === 0 ? (
                <div className="best-times__empty">尚无记录</div>
              ) : (
                <ol className="best-times__list">
                  {list.map((entry, i) => (
                    <li key={i} className="best-times__item">
                      <span className="best-times__rank">{i + 1}</span>
                      <span className="best-times__time">{formatTime(entry.time)}</span>
                      <span className="best-times__date">{formatDate(entry.date)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
