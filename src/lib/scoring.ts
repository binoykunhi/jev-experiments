import type { DeterministicResult, Level, QualityResult, Scenario, SemanticAnswers, Verdict } from "./types";

/** Agent Quality is computed here from atomic metrics. Jev is never asked for an overall grade. */
export const WEIGHTS = {
  task_completion: { label: "Task completion", weight: 0.3 },
  action_correctness: { label: "Tool / action correctness", weight: 0.25 },
  groundedness: { label: "Groundedness", weight: 0.2 },
  handoff: { label: "Handoff correctness", weight: 0.1 },
  understanding: { label: "Understanding", weight: 0.1 },
  efficiency: { label: "Conversation efficiency", weight: 0.05 },
} as const;

export function actualDecision(det: DeterministicResult) {
  if (det.facts.transferInvoked) return "transfer_to_human" as const;
  return det.facts.endsWithQuestion ? ("clarify" as const) : ("continue" as const);
}

export function computeQuality(
  s: Scenario,
  det: DeterministicResult,
  sem: SemanticAnswers,
  verdict: Verdict,
): QualityResult {
  const values = {
    task_completion: sem.task_completion.score / (Object.keys(sem.task_completion.probabilities).length - 1),
    // Half hard evidence (were the right tools called and successful), half Jev's judgement.
    action_correctness: 0.5 * det.toolScore + 0.5 * sem.agent_action_correctness,
    groundedness: sem.response_grounded,
    // How likely Jev thinks the agent's actual decision was the right one.
    handoff: sem.handoff_decision.probabilities[actualDecision(det)] ?? 0,
    understanding: sem.intent_understood,
    efficiency: Math.min(1, s.expectations.idealTurns / Math.max(1, det.facts.turns)),
  };

  const breakdown = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((key) => ({
    key,
    label: WEIGHTS[key].label,
    weight: WEIGHTS[key].weight,
    value: Math.min(1, Math.max(0, values[key])),
  }));
  const score = Math.round(100 * breakdown.reduce((sum, b) => sum + b.weight * b.value, 0));

  const level: Level =
    verdict.level === "CRITICAL" ? "CRITICAL" : score >= 80 ? "PASS" : score >= 60 ? "WARNING" : "FAIL";

  return {
    score,
    level,
    breakdown,
    issue: verdict.level === "PASS" ? undefined : verdict.headline,
  };
}
