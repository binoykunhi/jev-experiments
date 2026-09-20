import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const Check = (p: P) => <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>;
export const X = (p: P) => <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const Alert = (p: P) => <svg {...base(p)}><path d="m10.3 3.9-8.4 14.5A2 2 0 0 0 3.6 21.4h16.8a2 2 0 0 0 1.7-3l-8.4-14.5a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01" /></svg>;
export const Siren = (p: P) => <svg {...base(p)}><path d="M7 18v-6a5 5 0 0 1 10 0v6M5 21h14M12 2v2M4.9 5.6l1.4 1.4M19.1 5.6 17.7 7M2 12h2M20 12h2" /></svg>;
export const User = (p: P) => <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
export const Bot = (p: P) => <svg {...base(p)}><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4M9 14h.01M15 14h.01" /></svg>;
export const Wrench = (p: P) => <svg {...base(p)}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2Z" /></svg>;
export const Inbox = (p: P) => <svg {...base(p)}><path d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7Z" /></svg>;
export const Play = (p: P) => <svg {...base(p)} fill="currentColor" strokeWidth={0}><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z" /></svg>;
export const Chevron = (p: P) => <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>;
export const ArrowUp = (p: P) => <svg {...base(p)}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
export const ArrowDown = (p: P) => <svg {...base(p)}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>;
export const Minus = (p: P) => <svg {...base(p)}><path d="M5 12h14" /></svg>;
export const Spinner = (p: P) => <svg {...base(p)} className={`animate-spin ${p.className ?? ""}`}><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>;
export const Scope = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
