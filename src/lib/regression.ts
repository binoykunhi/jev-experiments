import data from "@/data/regression.json";

export type Result = "PASS" | "FAIL";
export interface TestRow { name: string; v17: Result; v18: Result; severity: string; note?: string }
export interface MetricRow { key: string; label: string; unit: string; v17: number; v18: number; higherIsBetter: boolean }

export const versions = data.versions;
export const metrics = data.metrics as MetricRow[];
export const tests = data.tests as TestRow[];

export const change = (t: TestRow) =>
  t.v17 === t.v18 ? "same" : t.v18 === "PASS" ? "fixed" : "regressed";

export function summarise() {
  const passed = (v: "v17" | "v18") => tests.filter((t) => t[v] === "PASS").length;
  const fixed = tests.filter((t) => change(t) === "fixed");
  const regressed = tests.filter((t) => change(t) === "regressed");
  const worseMetrics = metrics.filter((m) => (m.higherIsBetter ? m.v18 < m.v17 : m.v18 > m.v17));
  const blocking = regressed.some((t) => t.severity === "high") || worseMetrics.length > 0;

  const decision = blocking ? "DO NOT SHIP" : regressed.length ? "SHIP WITH REVIEW" : "SHIP";
  return { total: tests.length, v17: passed("v17"), v18: passed("v18"), fixed, regressed, decision, blocking };
}
