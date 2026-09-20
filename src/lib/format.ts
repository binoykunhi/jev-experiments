export const formatTime = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export const formatCall = (tool: string, args?: Record<string, string | number | boolean>) =>
  `${tool}(${Object.entries(args ?? {}).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})`;

export const pct = (n: number) => `${Math.round(n * 100)}%`;
