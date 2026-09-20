import { formatTime } from "@/lib/format";
import type { EvaluationReport, TimelineEntry } from "@/lib/types";
import { Card, CardHeader, Pill, StatusIcon, TONE, type Tone } from "../ui";

const LABEL: Record<string, string> = { critical: "CRITICAL FAILURE", pass: "PASS", warn: "WARNING", fail: "FAIL" };

function Detail({ label, value, mono = true }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wider text-mute">{label}</dt>
      <dd className={`mt-0.5 text-sm text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Entry({ entry, verdictLabel, last }: { entry: TimelineEntry; verdictLabel?: string; last: boolean }) {
  const tone = entry.status as Tone;
  const t = TONE[tone];
  const highlight = Boolean(entry.detail) || entry.status === "critical";

  return (
    <li className="animate-rise relative flex gap-4 pb-6 last:pb-0">
      <span className="w-11 shrink-0 pt-0.5 font-mono text-xs text-mute">{formatTime(entry.t)}</span>
      <div className="relative flex flex-col items-center">
        <span className={`z-10 mt-1 grid size-5 place-items-center rounded-full border bg-canvas ${t.border}`}>
          <StatusIcon tone={tone} className="size-3" />
        </span>
        {!last && <span className="absolute top-6 -bottom-6 w-px bg-line" />}
      </div>

      {highlight ? (
        <div className={`min-w-0 flex-1 rounded-xl border p-4 ${t.border} ${t.soft} ${entry.status === "critical" ? "animate-critical" : ""}`}>
          <p className="text-sm text-ink">{entry.title}</p>
          {entry.subtitle && <p className="mt-0.5 text-sm italic text-mute">{entry.subtitle}</p>}
          <div className="mt-3 flex items-center gap-2">
            <StatusIcon tone={tone} className="size-5" />
            <span className={`text-lg font-semibold tracking-wide ${t.text}`}>{verdictLabel ?? LABEL[entry.status]}</span>
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Detail label="EXPECTED" value={entry.detail?.expected} />
            <Detail label="ACTUAL" value={entry.detail?.actual} mono={false} />
            <Detail label="SYSTEM STATE" value={entry.detail?.systemState} />
            <Detail label="REASON" value={entry.detail?.reason} mono={false} />
          </dl>
        </div>
      ) : (
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`text-sm text-ink ${entry.title.endsWith("()") ? "font-mono" : ""}`}>{entry.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-mute">
            {entry.subtitle}
            <Pill tone={tone}>{entry.status === "warn" ? "WARN" : entry.status.toUpperCase()}</Pill>
          </p>
        </div>
      )}
    </li>
  );
}

export function FailureTimeline({ report, eventsShown }: { report: EvaluationReport; eventsShown: number }) {
  const entries = report.timeline.filter((e) => eventsShown >= e.revealAt);
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Failure Timeline" sub="Where the run was judged, and what the evidence says" />
      <ol className="px-5 py-6">
        {entries.map((e, i) => (
          <Entry key={`${e.t}-${e.title}-${i}`} entry={e} last={i === entries.length - 1} verdictLabel={e.detail ? report.verdict.label : undefined} />
        ))}
      </ol>
      <details className="group border-t border-line px-5 py-3">
        <summary className="cursor-pointer list-none text-xs text-mute hover:text-ink">
          <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
          What Jev sees: the full agent state sent to the evaluator
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-line bg-canvas p-4 font-mono text-[12px] leading-relaxed text-mute">{JSON.stringify(report.state, null, 2)}</pre>
      </details>
    </Card>
  );
}
