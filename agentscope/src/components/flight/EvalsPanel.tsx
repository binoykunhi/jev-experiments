import { pct } from "@/lib/format";
import type { EvalItem, EvaluationReport, ReportSource } from "@/lib/types";
import { Bar, Card, CardHeader, Pill, StatusIcon } from "../ui";
import { Spinner } from "../icons";

const ORDER = [
  ["intent_understood", "Intent understood"],
  ["agent_action_correctness", "Correct action"],
  ["response_grounded", "Response grounded"],
  ["task_completion", "Task completion"],
  ["handoff_decision", "Handoff"],
  ["unnecessary_repetition", "No repetition"],
] as const;

function SourcePill({ report }: { report: EvaluationReport | null }) {
  if (!report) return null;
  const map: Record<ReportSource, { tone: "pass" | "warn" | "info"; text: string }> = {
    live: { tone: "pass", text: `LIVE · JEV${report.latencyMs ? ` · ${report.latencyMs} ms` : ""}` },
    demo: { tone: "info", text: "DEMO MODE · RECORDED" },
    "demo-fallback": { tone: "warn", text: "LIVE CALL FAILED · RECORDED" },
  };
  const m = map[report.source];
  return <Pill tone={m.tone}>{m.text}</Pill>;
}

function Row({ item, shown, waiting, label }: { item?: EvalItem; shown: boolean; waiting: boolean; label: string }) {
  if (!item || !shown) {
    return (
      <li className="flex items-center gap-3 px-5 py-3">
        <span className="grid size-5 place-items-center">{waiting ? <Spinner className="size-3.5 text-dim" /> : <span className="size-1.5 rounded-full bg-line" />}</span>
        <span className="flex-1 text-sm text-dim">{label}</span>
        {waiting && <span className="skeleton h-3 w-10 rounded" />}
      </li>
    );
  }
  return (
    <li className="animate-rise px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="grid size-5 place-items-center"><StatusIcon tone={item.status} /></span>
        <span className="flex-1 text-sm font-medium text-ink">{item.label}</span>
        <span className="font-mono text-sm tabular-nums text-ink" title={item.raw}>{pct(item.confidence)}</span>
      </div>
      <div className="mt-2 pl-8">
        <Bar value={item.confidence} tone={item.status} />
        <p className="mt-1.5 text-xs text-mute">{item.detail} <span className="font-mono text-dim">· {item.raw}</span></p>
      </div>
    </li>
  );
}

export function EvalsPanel({ report, eventsShown, running, started }: { report: EvaluationReport | null; eventsShown: number; running: boolean; started: boolean }) {
  const byId = new Map(report?.items.map((i) => [i.id, i]));
  return (
    <Card>
      <CardHeader title="Live Evals" sub="6 atomic questions · answered by Jev in one call" right={<SourcePill report={report} />} />
      <ul className="divide-y divide-line/60">
        {ORDER.map(([id, label]) => {
          const item = byId.get(id);
          const shown = Boolean(item && eventsShown >= item.revealAt);
          // Waiting = the trace has reached this eval's step but Jev has not answered yet.
          const waiting = started && !report && running;
          return <Row key={id} item={item} shown={shown} waiting={waiting} label={label} />;
        })}
      </ul>
      {report && eventsShown >= (report.items[0]?.revealAt ?? 0) && (
        <div className="animate-rise border-t border-line px-5 py-3.5">
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-mute">DETERMINISTIC CHECKS · NO AI</p>
          <div className="flex flex-wrap gap-1.5">
            {report.deterministic.checks.map((c) => (
              <span key={c.id} title={c.detail} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2 py-1 font-mono text-[11px] text-ink/90">
                <StatusIcon tone={c.status} className="size-3" />{c.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2 py-1 font-mono text-[11px] text-mute">
              {report.deterministic.facts.toolCallCount} tool {report.deterministic.facts.toolCallCount === 1 ? "call" : "calls"} · {report.deterministic.facts.turns} turns
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
