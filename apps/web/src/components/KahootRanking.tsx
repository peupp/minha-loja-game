import { type ReactNode, useEffect, useMemo, useState } from "react";

export interface RankingEntry {
  id: string;
  name: string;
  score: number;
}

interface Props {
  title: string;
  subtitle?: string;
  entries: RankingEntry[];
  valueSuffix?: string;
  showPodium?: boolean;
  children?: ReactNode;
}

const BAR_COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c", "#9c27b0", "#00bcd4"];

function useAnimatedScores(entries: RankingEntry[], durationMs = 1400) {
  const max = Math.max(...entries.map((e) => e.score), 1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [entries, durationMs]);

  return entries.map((e) => ({
    ...e,
    displayScore: e.score * progress,
    widthPct: max > 0 ? (e.score / max) * 100 * progress : 0,
  }));
}

export default function KahootRanking({
  title,
  subtitle,
  entries,
  valueSuffix = "%",
  showPodium = false,
  children,
}: Props) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.score - a.score),
    [entries]
  );
  const animated = useAnimatedScores(sorted);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    if (sorted.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    sorted.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 400 + i * 350));
    });
    return () => timers.forEach(clearTimeout);
  }, [sorted]);

  const top3 = animated.slice(0, 3);

  return (
    <div className="kahoot-screen">
      <div className="kahoot-header">
        <p className="kahoot-brand">Minha Loja</p>
        <h1 className="kahoot-title">{title}</h1>
        {subtitle && <p className="kahoot-subtitle">{subtitle}</p>}
      </div>

      {showPodium && top3.length > 0 && (
        <div className="kahoot-podium">
          {top3[1] && revealed >= 2 && (
            <div className="kahoot-podium-item place-2">
              <span className="kahoot-podium-medal">2</span>
              <strong>{top3[1].name}</strong>
              <span>
                {top3[1].displayScore.toFixed(1)}
                {valueSuffix}
              </span>
            </div>
          )}
          {top3[0] && revealed >= 1 && (
            <div className="kahoot-podium-item place-1">
              <span className="kahoot-podium-medal">1</span>
              <strong>{top3[0].name}</strong>
              <span>
                {top3[0].displayScore.toFixed(1)}
                {valueSuffix}
              </span>
            </div>
          )}
          {top3[2] && revealed >= 3 && (
            <div className="kahoot-podium-item place-3">
              <span className="kahoot-podium-medal">3</span>
              <strong>{top3[2].name}</strong>
              <span>
                {top3[2].displayScore.toFixed(1)}
                {valueSuffix}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="kahoot-leaderboard">
        {animated.map((entry, index) => (
          <div
            key={entry.id}
            className={`kahoot-row ${index < revealed ? "kahoot-row--visible" : ""}`}
            style={{ transitionDelay: `${index * 80}ms` }}
          >
            <div className="kahoot-row-rank">{index + 1}</div>
            <div className="kahoot-row-body">
              <div className="kahoot-row-labels">
                <span className="kahoot-row-name">{entry.name}</span>
                <span className="kahoot-row-score">
                  {entry.displayScore.toFixed(1)}
                  {valueSuffix}
                </span>
              </div>
              <div className="kahoot-bar-track">
                <div
                  className="kahoot-bar-fill"
                  style={{
                    width: `${entry.widthPct}%`,
                    background: BAR_COLORS[index % BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="kahoot-empty">Aguardando resultados da rodada…</p>
      )}

      {children}
    </div>
  );
}
