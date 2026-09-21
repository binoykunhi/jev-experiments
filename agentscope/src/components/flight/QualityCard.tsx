import { useEffect, useState } from "react";
import type { QualityResult } from "@/lib/types";
import { Bar, Card, Pill, TONE, levelTone } from "../ui";
import { Alert } from "../icons";

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

export function QualityCard({ quality }: { quality: QualityResult }) {
  const n = useCountUp(quality.score);
  const tone = levelTone(quality.level);
  return (
    <Card className="animate-rise">
      <div className="flex items-start justify-between gap-4 px-5 pt-4">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-mute">AGENT QUALITY</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className={`font-mono text-5xl font-semibold tabular-nums tracking-tight ${TONE[tone].text}`}>{n}</span>
            <span className="text-lg text-dim">/ 100</span>
          </p>
        </div>
        <Pill tone={tone}>{quality.level}</Pill>
      </div>
      {quality.issue && (
        <div className={`mx-5 mt-3 flex gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${TONE[tone].border} ${TONE[tone].soft} ${TONE[tone].text}`}>
          <Alert className="mt-0.5 size-3.5 shrink-0" />
          <span><span className="font-semibold">{quality.level === "CRITICAL" ? "Critical issue: " : "Issue: "}</span>{quality.issue}</span>
        </div>
      )}
      <ul className="space-y-2.5 px-5 pb-4 pt-4">
        {quality.breakdown.map((b, i) => (
          <li key={b.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-mute">{b.label} <span className="text-dim">· {Math.round(b.weight * 100)}%</span></span>
              <span className="font-mono tabular-nums text-ink/80">{Math.round(b.value * 100)}</span>
            </div>
            <Bar value={b.value} tone={b.value >= 0.75 ? "pass" : b.value >= 0.45 ? "warn" : "fail"} delay={i * 60} />
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-2.5 text-[11px] text-dim">Computed in code from atomic metrics. Jev is never asked for an overall grade.</p>
    </Card>
  );
}
