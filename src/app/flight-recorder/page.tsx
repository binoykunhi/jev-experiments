import type { Metadata } from "next";
import { FlightRecorder } from "@/components/flight/FlightRecorder";

export const metadata: Metadata = { title: "Flight Recorder · AgentScope" };

export default function FlightRecorderPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-6 py-10">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-mute">AGENTSCOPE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">AI Agent Flight Recorder</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mute">
            Observability tells you whether the agent is running. <span className="text-ink">AgentScope tells you whether it&apos;s doing its job.</span>
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-2 divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel text-sm">
          <div className="px-4 py-3">
            <dt className="text-[11px] font-semibold tracking-wider text-dim">TRADITIONAL OBSERVABILITY</dt>
            <dd className="mt-1 text-mute">Did the API work?</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-[11px] font-semibold tracking-wider text-mute">AGENTSCOPE</dt>
            <dd className="mt-1 text-ink">Did the AI agent do the right thing?</dd>
          </div>
        </dl>
      </header>
      <FlightRecorder />
    </main>
  );
}
