import type { ReactNode } from "react";
import type { Level, Status } from "@/lib/types";
import { Alert, Check, Siren, X } from "./icons";

export type Tone = Status | "critical" | "info";

export const TONE: Record<Tone, { text: string; soft: string; ring: string; solid: string; border: string }> = {
  pass: { text: "text-emerald-600", soft: "bg-emerald-500/10", ring: "ring-emerald-500/25", solid: "bg-emerald-500", border: "border-emerald-500/30" },
  warn: { text: "text-amber-600", soft: "bg-amber-400/15", ring: "ring-amber-400/30", solid: "bg-amber-400", border: "border-amber-400/40" },
  fail: { text: "text-orange-600", soft: "bg-orange-500/10", ring: "ring-orange-500/25", solid: "bg-orange-500", border: "border-orange-500/30" },
  critical: { text: "text-rose-600", soft: "bg-rose-500/10", ring: "ring-rose-500/30", solid: "bg-rose-500", border: "border-rose-500/40" },
  info: { text: "text-mute", soft: "bg-black/5", ring: "ring-black/10", solid: "bg-dim", border: "border-line" },
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
    <div className="h-1 overflow-hidden rounded-full bg-black/5">
      <div
        className={`animate-grow h-full rounded-full ${TONE[tone].solid}`}
        style={{ width: `${Math.round(value * 100)}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}
