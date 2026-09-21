import type { ReactNode } from "react";
import type { Level, Status } from "@/lib/types";
import { Alert, Check, Siren, X } from "./icons";

export type Tone = Status | "critical" | "info";

export const TONE: Record<Tone, { text: string; soft: string; ring: string; solid: string; border: string }> = {
  pass: { text: "text-emerald-300", soft: "bg-emerald-400/10", ring: "ring-emerald-400/25", solid: "bg-emerald-400", border: "border-emerald-400/30" },
  warn: { text: "text-amber-300", soft: "bg-amber-300/10", ring: "ring-amber-300/25", solid: "bg-amber-300", border: "border-amber-300/30" },
  fail: { text: "text-orange-300", soft: "bg-orange-400/10", ring: "ring-orange-400/25", solid: "bg-orange-400", border: "border-orange-400/30" },
  critical: { text: "text-rose-300", soft: "bg-rose-500/10", ring: "ring-rose-500/40", solid: "bg-rose-500", border: "border-rose-500/50" },
  info: { text: "text-mute", soft: "bg-white/5", ring: "ring-white/10", solid: "bg-dim", border: "border-line" },
};

export const levelTone = (l: Level): Tone => (l === "PASS" ? "pass" : l === "WARNING" ? "warn" : l === "FAIL" ? "fail" : "critical");

export function StatusIcon({ tone, className = "size-4" }: { tone: Tone; className?: string }) {
  const cls = `${className} ${TONE[tone].text}`;
  if (tone === "pass") return <Check className={cls} />;
  if (tone === "warn") return <Alert className={cls} />;
  if (tone === "critical") return <Siren className={cls} />;
  if (tone === "fail") return <X className={cls} />;
  return <span className={`inline-block size-2 rounded-full ${TONE.info.solid}`} />;
}

export function Pill({ tone, children, className = "" }: { tone: Tone; children: ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${t.text} ${t.soft} ${t.ring} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-panel ${className}`}>{children}</section>;
}

export function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
      <div>
        <h2 className="text-[13px] font-semibold tracking-wide text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Bar({ value, tone, delay = 0 }: { value: number; tone: Tone; delay?: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/5">
      <div
        className={`animate-grow h-full rounded-full ${TONE[tone].solid}`}
        style={{ width: `${Math.round(value * 100)}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}
