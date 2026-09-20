import { useEffect, useRef } from "react";
import { formatCall, formatTime } from "@/lib/format";
import type { TraceEvent } from "@/lib/types";
import { Bot, Inbox, User, Wrench } from "../icons";
import { Card, CardHeader, Pill, type Tone } from "../ui";

const RESULT_TONE: Record<string, Tone> = { SUCCESS: "pass", FAILED: "fail", TIMEOUT: "warn" };

function Row({ event }: { event: TraceEvent }) {
  const time = <span className="mt-1 w-10 shrink-0 font-mono text-[11px] text-dim">{formatTime(event.t)}</span>;

  if (event.type === "tool_call" || event.type === "tool_result") {
    const isCall = event.type === "tool_call";
    return (
      <div className="animate-rise flex gap-3">
        {time}
        <div className="min-w-0 flex-1 rounded-lg border border-line bg-panel2 px-3.5 py-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-mute">
            {isCall ? <Wrench className="size-3.5" /> : <Inbox className="size-3.5" />}
            {isCall ? "TOOL CALL" : "TOOL RESULT"}
            {!isCall && event.status && <Pill tone={RESULT_TONE[event.status]}>{event.status}</Pill>}
          </div>
          <code className="block break-words font-mono text-[13px] text-ink">
            {isCall ? formatCall(event.tool!, event.args) : event.summary}
          </code>
        </div>
      </div>
    );
  }

  const customer = event.type === "customer";
  return (
    <div className="animate-rise flex gap-3">
      {time}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-mute">
          {customer ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
          {customer ? "CUSTOMER" : "AI AGENT"}
        </div>
        <p className={`text-[15px] leading-relaxed ${customer ? "text-ink" : "text-ink/90"}`}>“{event.text}”</p>
      </div>
    </div>
  );
}

export function Conversation({ events, shown, running }: { events: TraceEvent[]; shown: number; running: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  // Scroll only the conversation box, never the page.
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" }); }, [shown]);

  return (
    <Card className="flex min-h-[440px] flex-col">
      <CardHeader
        title="Conversation"
        sub="Every turn, tool call and tool result, in order"
        right={running ? <Pill tone="info"><span className="relative flex size-1.5"><span className="animate-ping-dot absolute inset-0 rounded-full bg-emerald-400" /><span className="relative size-1.5 rounded-full bg-emerald-400" /></span>RECORDING</Pill> : undefined}
      />
      <div ref={box} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 lg:max-h-[520px]">
        {shown === 0 ? (
          <div className="grid h-full min-h-[300px] place-items-center text-center">
            <div>
              <p className="text-sm text-mute">No call recorded yet.</p>
              <p className="mt-1 text-xs text-dim">Press <span className="text-ink">Run Simulation</span> to replay this scenario.</p>
            </div>
          </div>
        ) : (
          events.slice(0, shown).map((e, i) => <Row key={i} event={e} />)
        )}
      </div>
    </Card>
  );
}
