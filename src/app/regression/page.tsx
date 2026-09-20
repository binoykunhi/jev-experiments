import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Minus } from "@/components/icons";
import { Bar, Card, CardHeader, Pill, TONE, type Tone } from "@/components/ui";
import { change, metrics, summarise, tests, versions } from "@/lib/regression";

export const metadata: Metadata = { title: "Regression · AgentScope" };

const fmt = (unit: string, n: number) => (unit === "pct" ? `${n}%` : n.toFixed(1));

function Delta({ v17, v18, higherIsBetter, unit }: { v17: number; v18: number; higherIsBetter: boolean; unit: string }) {
  const diff = v18 - v17;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  const tone: Tone = diff === 0 ? "info" : good ? "pass" : "fail";
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${TONE[tone].text}`}>
      <Icon className="size-3.5" />
      {unit === "pct" ? `${Math.abs(diff)} pts` : Math.abs(diff).toFixed(1)}
    </span>
  );
}

const resultTone = (r: string): Tone => (r === "PASS" ? "pass" : "fail");

export default function RegressionPage() {
  const s = summarise();
  const decisionTone: Tone = s.decision === "SHIP" ? "pass" : s.decision === "SHIP WITH REVIEW" ? "warn" : "critical";

  return (
    <main className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-mute">AGENTSCOPE</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agent Regression Testing</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mute">
          Every time you change the prompt, the model or the tools, replay your customer journeys and see whether behaviour <span className="text-ink">improved or regressed</span>.
        </p>
      </header>

      {/* The question */}
      <div className={`animate-rise mb-6 flex flex-col gap-4 rounded-xl border p-6 sm:flex-row sm:items-center sm:justify-between ${TONE[decisionTone].border} ${TONE[decisionTone].soft}`}>
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-mute">WOULD I SHIP AGENT {versions[1].id.toUpperCase()}?</p>
          <p className={`mt-1 text-3xl font-semibold tracking-tight ${TONE[decisionTone].text}`}>{s.decision}</p>
          <p className="mt-1.5 text-sm text-ink/90">
            {s.fixed.length} scenario{s.fixed.length === 1 ? "" : "s"} fixed
            {s.regressed.length > 0 && <>, <span className="text-orange-300">{s.regressed.length} regression: {s.regressed.map((t) => t.name).join(", ")}</span></>}
            . Tests passed {s.v17}/{s.total} → {s.v18}/{s.total}.
          </p>
        </div>
        <div className="flex gap-6 font-mono">
          {(["v17", "v18"] as const).map((v, i) => (
            <div key={v}>
              <p className="text-[11px] font-semibold tracking-wider text-mute">{versions[i].id}</p>
              <p className="text-3xl font-semibold tabular-nums text-ink">{s[v]}<span className="text-lg text-dim"> / {s.total}</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Metrics */}
        <Card>
          <CardHeader title="Metrics" sub="Averaged across the replayed scenarios" />
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6 px-5 pb-1 pt-3 text-[11px] font-semibold tracking-wider text-dim">
            <span />
            <span className="w-14 text-right">{versions[0].id}</span>
            <span className="w-14 text-right text-mute">{versions[1].id}</span>
            <span className="w-16 text-right">CHANGE</span>
          </div>
          <ul className="divide-y divide-line/60">
            {metrics.map((m) => (
              <li key={m.key} className="px-5 py-3.5">
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-6">
                  <span className="text-sm text-ink">{m.label}</span>
                  <span className="w-14 text-right font-mono text-sm tabular-nums text-mute">{fmt(m.unit, m.v17)}</span>
                  <span className="w-14 text-right font-mono text-sm font-semibold tabular-nums text-ink">{fmt(m.unit, m.v18)}</span>
                  <span className="flex w-16 justify-end"><Delta v17={m.v17} v18={m.v18} higherIsBetter={m.higherIsBetter} unit={m.unit} /></span>
                </div>
                {m.unit === "pct" && (
                  <div className="mt-2.5 space-y-1">
                    <Bar value={m.v17 / 100} tone="info" />
                    <Bar value={m.v18 / 100} tone={m.v18 >= m.v17 ? "pass" : "fail"} delay={120} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {/* Scenarios */}
        <Card>
          <CardHeader title="Scenario replay" sub="Same customer journeys, both agent versions" />
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-5 pb-1 pt-3 text-[11px] font-semibold tracking-wider text-dim">
            <span />
            <span className="w-14 text-center">{versions[0].id}</span>
            <span className="w-14 text-center text-mute">{versions[1].id}</span>
            <span className="w-24 text-right">CHANGE</span>
          </div>
          <ul className="divide-y divide-line/60">
            {tests.map((t) => {
              const c = change(t);
              return (
                <li key={t.name} className="px-5 py-3">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4">
                    <span className="text-sm text-ink">{t.name}</span>
                    <span className="flex w-14 justify-center"><Pill tone={resultTone(t.v17)}>{t.v17}</Pill></span>
                    <span className="flex w-14 justify-center"><Pill tone={resultTone(t.v18)}>{t.v18}</Pill></span>
                    <span className="flex w-24 justify-end">
                      {c === "fixed" && <Pill tone="pass">FIXED</Pill>}
                      {c === "regressed" && <Pill tone="critical">REGRESSED</Pill>}
                      {c === "same" && <span className="text-xs text-dim">·</span>}
                    </span>
                  </div>
                  {t.note && c !== "same" && <p className="mt-1 text-xs text-mute">{t.note}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-xs text-dim">
        Demo data: results are precomputed from local scenario fixtures. In a real setup each row is one replayed journey, scored by the same deterministic and Jev evaluators shown in the Flight Recorder.
      </p>
    </main>
  );
}
