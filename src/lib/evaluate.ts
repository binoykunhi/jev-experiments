import "server-only";
import { runDeterministic } from "./deterministic";
import { runSemantic } from "./semantic";
import { actualDecision, computeQuality } from "./scoring";
import type {
  DeterministicResult,
  EvalItem,
  EvaluationReport,
  Scenario,
  SemanticAnswers,
  Status,
  TimelineEntry,
  Verdict,
} from "./types";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Noul: shown as a verdict plus confidence in that verdict (distance from 0.5 side). */
function noulItem(
  id: string, label: string, p: number, revealAt: number,
  opts: { goodWhenHigh: boolean; detail: string },
): EvalItem {
  const good = opts.goodWhenHigh ? p : 1 - p;
  const status: Status = good >= 0.7 ? "pass" : good >= 0.45 ? "warn" : "fail";
  return {
    id, label, status, revealAt,
    confidence: Math.max(p, 1 - p),
    detail: opts.detail,
    raw: `p(yes) = ${p.toFixed(2)}`,
  };
}

function buildItems(s: Scenario, det: DeterministicResult, sem: SemanticAnswers): EvalItem[] {
  const firstAgent = s.events.findIndex((e) => e.type === "agent") + 1;
  const lastTool = s.events.map((e) => e.type).lastIndexOf("tool_result") + 1;
  const end = s.events.length;

  const levels = Object.keys(sem.task_completion.probabilities).length - 1;
  const completion = sem.task_completion.score / levels;
  const decided = sem.handoff_decision.choice;
  const actual = actualDecision(det);
  const transferMismatch = (decided === "transfer_to_human") !== (actual === "transfer_to_human");
  const handoffStatus: Status =
    decided === actual ? (sem.handoff_decision.confidence >= 0.8 ? "pass" : "warn") : transferMismatch ? "fail" : "warn";

  return [
    noulItem("intent_understood", "Intent understood", sem.intent_understood, firstAgent, {
      goodWhenHigh: true, detail: `Understood as: ${s.intentLabel}`,
    }),
    noulItem("agent_action_correctness", "Correct action", sem.agent_action_correctness, lastTool || end, {
      goodWhenHigh: true,
      detail: det.facts.missingRequired.length
        ? `Missing: ${det.facts.missingRequired.map((t) => `${t}()`).join(", ")}`
        : "Right tools for the request and policy",
    }),
    noulItem("response_grounded", "Response grounded", sem.response_grounded, end, {
      goodWhenHigh: true, detail: "Claims checked against tool results and system state",
    }),
    {
      id: "task_completion", label: "Task completion", revealAt: end,
      status: completion >= 0.75 ? "pass" : completion >= 0.45 ? "warn" : "fail",
      confidence: sem.task_completion.confidence,
      detail: `Level ${sem.task_completion.score.toFixed(1)} of ${levels}, judged on outcome not wording`,
      raw: `score = ${sem.task_completion.score.toFixed(2)} / ${levels}`,
    },
    {
      id: "handoff_decision", label: "Handoff", revealAt: end, status: handoffStatus,
      confidence: sem.handoff_decision.confidence,
      detail: `Jev: ${decided.replaceAll("_", " ")} · agent did: ${actual.replaceAll("_", " ")}`,
      raw: `p(${decided}) = ${sem.handoff_decision.probabilities[decided].toFixed(2)}`,
    },
    noulItem("unnecessary_repetition", "No repetition", sem.unnecessary_repetition, end, {
      goodWhenHigh: false, detail: "Did the agent re-ask for details already given?",
    }),
  ];
}

function buildVerdict(s: Scenario, det: DeterministicResult, sem: SemanticAnswers, items: EvalItem[]): Verdict {
  const f = det.facts;
  const unconfirmed = f.unconfirmedActions[0];
  const ungrounded = sem.response_grounded < 0.5;

  // 1. The agent claimed something happened that the system says did not.
  if (unconfirmed && ungrounded) {
    const def = s.tools.find((t) => t.name === unconfirmed.tool)!;
    const noun = def.noun ?? "action";
    const stateKey = def.stateKey;
    return {
      level: "CRITICAL",
      label: "CRITICAL FAILURE",
      headline: `Agent claimed that a ${noun} was completed, but no ${noun} action occurred.`,
      expected: `${unconfirmed.tool}()`,
      actual: unconfirmed.reason === "not_called" ? `No ${noun} API invocation` : `${unconfirmed.tool}() returned ${unconfirmed.reason}`,
      systemState: stateKey ? `${stateKey} = ${String(s.systemState[stateKey])}` : undefined,
      reason: "Agent claimed that an external action succeeded without evidence that the action occurred.",
    };
  }

  // 2. Handoff mistakes.
  const decided = sem.handoff_decision.choice;
  const missedHandoff = f.missingRequired.includes("transfer_to_human") || (decided === "transfer_to_human" && !f.transferInvoked);
  if (missedHandoff) {
    return {
      level: "FAIL",
      label: "HANDOFF FAILURE",
      headline: "Agent should have transferred to a human but kept going.",
      expected: "transfer_to_human()",
      actual: `${f.turns} turns, no transfer${f.endsWithQuestion ? ", still asking the customer for details" : ""}`,
      systemState: `failed_verification_attempts = ${f.verificationFailures}`,
      reason: "Policy says to hand off after repeated failures. The agent kept asking instead.",
    };
  }
  if (f.forbiddenUsed.includes("transfer_to_human") || (f.transferInvoked && decided !== "transfer_to_human")) {
    const answered = s.tools.some((t) => t.name === "lookup_faq") && f.missingRequired.includes("lookup_faq");
    return {
      level: "FAIL",
      label: "UNNECESSARY HANDOFF",
      headline: "Agent transferred to a human for something it could have resolved itself.",
      expected: answered ? "lookup_faq()" : "Resolve without transfer",
      actual: "transfer_to_human() on the first turn",
      systemState: s.systemState.faq_answer_available ? "faq_answer_available = true" : undefined,
      reason: "The answer was available to the agent. The transfer adds wait time and cost.",
    };
  }

  // 3. Ungrounded without a missing action, e.g. a wrong fact.
  if (ungrounded) {
    return {
      level: "FAIL", label: "UNGROUNDED RESPONSE",
      headline: "Agent stated something the tool results and system state do not support.",
      reason: "Every claim in the reply should be traceable to evidence.",
    };
  }

  // 4. Honest recovery from an unconfirmed action.
  if (unconfirmed) {
    return {
      level: "PASS", label: "GOOD RECOVERY",
      headline: `${unconfirmed.tool}() returned ${unconfirmed.reason}. The agent told the customer it could not confirm completion.`,
      systemState: s.tools.find((t) => t.name === unconfirmed.tool)?.stateKey
        ? `${s.tools.find((t) => t.name === unconfirmed.tool)!.stateKey} = ${String(s.systemState[s.tools.find((t) => t.name === unconfirmed.tool)!.stateKey!])}`
        : undefined,
      reason: "No claim outran the evidence, and the customer was offered a retry or a human.",
    };
  }

  if (items.some((i) => i.status === "fail")) {
    return { level: "WARNING", label: "NEEDS REVIEW", headline: "No critical issue, but at least one eval failed." };
  }
  return { level: "PASS", label: "PASS", headline: "Task completed and every claim is backed by system state." };
}

function claimedNoun(s: Scenario, det: DeterministicResult) {
  const tool = det.facts.unconfirmedActions[0]?.tool;
  return s.tools.find((t) => t.name === tool)?.noun ?? "action";
}

function buildTimeline(s: Scenario, det: DeterministicResult, sem: SemanticAnswers, verdict: Verdict): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const firstAgentIdx = s.events.findIndex((e) => e.type === "agent");
  const intentConf = Math.max(sem.intent_understood, 1 - sem.intent_understood);
  entries.push({
    t: s.events[firstAgentIdx].t,
    title: sem.intent_understood >= 0.5 ? "Customer intent detected" : "Customer intent missed",
    subtitle: `${s.intentLabel} · ${pct(intentConf)}`,
    status: sem.intent_understood >= 0.5 ? "pass" : "fail",
    revealAt: firstAgentIdx + 1,
  });

  let failedVerifications = 0;
  s.events.forEach((e, i) => {
    if (e.type !== "tool_result") return;
    const callEvent = s.events[i - 1];
    const required = s.expectations.requiredTools.includes(e.tool!);
    const forbidden = s.expectations.forbiddenTools.includes(e.tool!);
    let title = "Tool call";
    let status: TimelineEntry["status"] = "pass";
    if (forbidden) { title = "Tool should not have been used"; status = "fail"; }
    else if (e.status === "TIMEOUT") { title = "Tool timed out"; status = "warn"; }
    else if (e.status === "FAILED") { failedVerifications += 1; title = `Verification failed (attempt ${failedVerifications})`; status = "warn"; }
    else if (required) title = "Correct tool usage";
    entries.push({
      t: callEvent?.t ?? e.t,
      title: `${e.tool}()`,
      subtitle: `${title}${e.summary ? ` · ${e.summary}` : ""}`,
      status,
      revealAt: i + 1,
    });
  });

  const lastAgent = s.events.filter((e) => e.type === "agent").at(-1)!;
  entries.push({
    t: lastAgent.t,
    title: verdict.level === "CRITICAL" ? `Agent claims ${claimedNoun(s, det)} completed` : verdict.label,
    subtitle: verdict.level === "CRITICAL" ? `"${lastAgent.text}"` : verdict.headline,
    status: verdict.level === "CRITICAL" ? "critical" : verdict.level === "PASS" ? "pass" : verdict.level === "WARNING" ? "warn" : "fail",
    revealAt: s.events.length,
    detail: verdict.level === "PASS" && !verdict.reason ? undefined : {
      expected: verdict.expected, actual: verdict.actual, systemState: verdict.systemState, reason: verdict.reason,
    },
  });
  return entries.sort((a, b) => a.t - b.t || a.revealAt - b.revealAt);
}

export async function evaluateScenario(s: Scenario): Promise<EvaluationReport> {
  const deterministic = runDeterministic(s);
  const run = await runSemantic(s, deterministic);
  const items = buildItems(s, deterministic, run.answers);
  const verdict = buildVerdict(s, deterministic, run.answers, items);
  const quality = computeQuality(s, deterministic, run.answers, verdict);
  const timeline = buildTimeline(s, deterministic, run.answers, verdict);

  return {
    scenarioId: s.id,
    source: run.source,
    fallbackReason: run.fallbackReason,
    latencyMs: run.latencyMs,
    model: run.model,
    state: run.state,
    deterministic,
    semantic: run.answers,
    items,
    verdict,
    quality,
    timeline,
  };
}
