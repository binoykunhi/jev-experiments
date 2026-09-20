"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scope } from "./icons";

const links = [
  { href: "/flight-recorder", label: "Flight Recorder" },
  { href: "/regression", label: "Regression" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        <Link href="/flight-recorder" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md border border-line bg-panel2 text-ink"><Scope className="size-4" /></span>
          <span className="text-sm font-semibold tracking-tight">AgentScope</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${active ? "bg-white/8 text-ink" : "text-mute hover:text-ink"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
