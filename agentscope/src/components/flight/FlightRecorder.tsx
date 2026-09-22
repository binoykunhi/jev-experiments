"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SCENARIO_ID, scenarios } from "@/data/scenarios";
import type { EvaluationReport } from "@/lib/types";
import { Play, Spinner } from "../icons";
import { Pill, TONE, levelTone } from "../ui";
import { Conversation } from "./Conversation";
import { EvalsPanel } from "./EvalsPanel";
import { FailureTimeline } from "./FailureTimeline";
import { QualityCard } from "./QualityCard";
import { Siren } from "../icons";

const delayFor = (type: string) => (type === "tool_call" ? 800 : type === "tool_result" ? 900 : 1300);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function FlightRecorder() {
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO_ID);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  const done = started && !running && shown === scenario.events.length;

  const reset = useCallback(() => {
    runId.current += 1; // cancels any playback in flight
    setShown(0); setRunning(false); setStarted(false); setReport(null); setError(null);
  }, []);

  useEffect(() => () => { runId.current += 1; }, []);

  const run = async () => {
    reset();
    const id = runId.current;
    setStarted(true); setRunning(true);

    // Evaluate on the server while the trace plays; the results are revealed as the trace reaches them.
    fetch("/api/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Evaluator returned ${r.status}`))))
      .then((data: EvaluationReport) => { if (runId.current === id) setReport(data); })
      .catch((e: Error) => { if (runId.current === id) setError(e.message); });

    for (let i = 0; i < scenario.events.length; i++) {
      if (i > 0) await sleep(delayFor(scenario.events[i].type));
      if (runId.current !== id) return;
      setShown(i + 1);
    }
    if (runId.current === id) setRunning(false);
  };

  const verdictVisible = done && report;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Scenario" className="flex flex-wrap gap-1.5">
          {scenarios.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === scenarioId}
              onClick={() => { setScenarioId(s.id); reset(); }}
              className={`rounded-lg border px-3.5 py-2 text-[13px] transition-colors ${
                s.id === scenarioId ? "border-black/15 bg-black/6 text-ink" : "border-line text-mute hover:border-black/10 hover:text-ink"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {running ? <Spinner className="size-4" /> : <Play className="size-3.5" />}
          {running ? "Running…" : started ? "Run again" : "Run Simulation"}
        </button>
      </div>

      <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
        {scenario.tagline}
        <Pill tone={levelTone(scenario.expected.level)}>EXPECTED · {scenario.expected.label}</Pill>
      </p>

      {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">Evaluation failed: {error}</p>}
      {report?.fallbackReason && (
        <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-100">
          The live TypeSafe call failed ({report.fallbackReason}). Showing recorded evaluator responses instead.
        </p>
      )}

      {/* The moment: verdict banner */}
      {verdictVisible && report.verdict.level !== "PASS" && (
        <div className={`animate-rise flex items-start gap-3 rounded-xl border px-5 py-4 ${TONE[levelTone(report.verdict.level)].border} ${TONE[levelTone(report.verdict.level)].soft} ${report.verdict.level === "CRITICAL" ? "animate-critical" : ""}`}>
          <Siren className={`mt-0.5 size-6 shrink-0 ${TONE[levelTone(report.verdict.level)].text}`} />
          <div>
            <p className={`text-base font-semibold tracking-wide ${TONE[levelTone(report.verdict.level)].text}`}>{report.verdict.label}</p>
            <p className="mt-0.5 text-[15px] text-ink">{report.verdict.headline}</p>
          </div>
        </div>
      )}
      {verdictVisible && report.verdict.level === "PASS" && (
        <div className="animate-rise flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4">
          <span className="text-base font-semibold tracking-wide text-emerald-300">{report.verdict.label}</span>
          <span className="text-[15px] text-ink">{report.verdict.headline}</span>
        </div>
      )}

      {/* Conversation + evals */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Conversation events={scenario.events} shown={shown} running={running} />
        <div className="space-y-6">
          <EvalsPanel report={report} eventsShown={shown} running={running} started={started} />
          {verdictVisible && <QualityCard quality={report.quality} />}
        </div>
      </div>

      {report && <FailureTimeline report={report} eventsShown={shown} />}
    </div>
  );
}
