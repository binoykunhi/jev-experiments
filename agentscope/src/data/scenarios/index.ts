import type { Scenario } from "@/lib/types";
import successfulRefund from "./01-successful-refund.json";
import hallucinatedRefund from "./02-hallucinated-refund.json";
import authenticationFailure from "./03-authentication-failure.json";
import toolTimeout from "./04-tool-timeout.json";
import incorrectHandoff from "./05-incorrect-handoff.json";

// To add a scenario: drop a JSON file in this folder (copy an existing one) and list it here.
export const scenarios = [
  successfulRefund,
  hallucinatedRefund,
  authenticationFailure,
  toolTimeout,
  incorrectHandoff,
] as Scenario[];

export const DEFAULT_SCENARIO_ID = "hallucinated-refund";

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}
