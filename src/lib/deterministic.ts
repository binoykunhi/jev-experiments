import type { ArgValue, DetCheck, DeterministicResult, Scenario, TraceEvent } from "./types";

/**
 * Deterministic evals: everything that can be checked directly is checked in code,
 * never by a model. The results also feed the semantic evaluator as ground-truth state.
 */

const toolCalls = (s: Scenario): TraceEvent[] => s.events.filter((e) => e.type === "tool_call");
const toolResults = (s: Scenario): TraceEvent[] => s.events.filter((e) => e.type === "tool_result");

/** Was each required tool called, and was anything forbidden called? */
export function evaluateToolUsage(s: Scenario) {
  const called = new Set(toolCalls(s).map((e) => e.tool!));
  const missingRequired = s.expectations.requiredTools.filter((t) => !called.has(t));
  const forbiddenUsed = s.expectations.forbiddenTools.filter((t) => called.has(t));

  const checks: DetCheck[] = s.expectations.requiredTools.map((tool) => ({
    id: `called_${tool}`,
    label: `${tool}() called`,
    status: called.has(tool) ? "pass" : "fail",
    detail: called.has(tool) ? "Tool was invoked" : "Required tool was never invoked",
  }));
  for (const tool of forbiddenUsed) {
    checks.push({
      id: `forbidden_${tool}`,
      label: `${tool}() called`,
      status: "fail",
      detail: "Tool should not have been used in this situation",
    });
  }
  return { checks, missingRequired, forbiddenUsed, calls: toolCalls(s).map((e) => e.tool!) };
}

/** Did each tool that ran come back with SUCCESS? */
export function evaluateToolSuccess(s: Scenario) {
  const results = toolResults(s);
  const errors = results.filter((e) => e.status !== "SUCCESS");
  const checks: DetCheck[] = errors.map((e, i) => ({
    id: `tool_error_${i}`,
    label: `${e.tool}() returned ${e.status}`,
    status: "warn",
    detail: e.summary ?? "",
  }));
  return { checks, toolErrors: errors.length, failedVerifications: results.filter((e) => e.tool === "verify_identity" && e.status !== "SUCCESS").length };
}

/** Compare what the backend says happened with what the agent was supposed to cause. */
export function evaluateSystemState(s: Scenario, toolUsage: ReturnType<typeof evaluateToolUsage>) {
  const resultFor = (tool: string) => toolResults(s).filter((e) => e.tool === tool).at(-1);
  const unconfirmed: DeterministicResult["facts"]["unconfirmedActions"] = [];
  const checks: DetCheck[] = [];

  for (const def of s.tools.filter((t) => t.sideEffect && s.expectations.requiredTools.includes(t.name))) {
    const result = resultFor(def.name);
    const reason = !result ? "not_called" : result.status !== "SUCCESS" ? result.status! : null;
    if (reason) unconfirmed.push({ tool: def.name, reason });
    if (def.stateKey) {
      const value = s.systemState[def.stateKey];
      checks.push({
        id: `state_${def.stateKey}`,
        label: `${def.stateKey} = ${String(value)}`,
        status: value === true ? "pass" : value === false ? "fail" : "warn",
        detail: value === true ? "Backend confirms the action" : "Backend has no record of the action",
      });
    }
  }
  return { checks, unconfirmed, toolUsage };
}

export function evaluateConversation(s: Scenario) {
  const messages = s.events.filter((e) => e.type === "customer" || e.type === "agent");
  const lastAgent = s.events.filter((e) => e.type === "agent").at(-1);
  return {
    turns: messages.length,
    endsWithQuestion: Boolean(lastAgent?.text?.trim().endsWith("?")),
  };
}

export function runDeterministic(s: Scenario): DeterministicResult {
  const usage = evaluateToolUsage(s);
  const success = evaluateToolSuccess(s);
  const state = evaluateSystemState(s, usage);
  const convo = evaluateConversation(s);

  const required = s.expectations.requiredTools;
  const ok = required.filter((t) => !usage.missingRequired.includes(t) && !state.unconfirmed.some((u) => u.tool === t && u.reason !== "not_called")).length;
  const toolScore = Math.max(0, (required.length ? ok / required.length : 1) - 0.5 * usage.forbiddenUsed.length);

  // Facts derived in code so the semantic evaluator never has to count or compare.
  const systemState: Record<string, ArgValue> = {
    ...s.systemState,
    tool_calls_made: usage.calls.length,
    failed_verification_attempts: success.failedVerifications,
    transfer_to_human_invoked: usage.calls.includes("transfer_to_human"),
  };

  return {
    checks: [...usage.checks, ...state.checks, ...success.checks],
    facts: {
      toolCalls: usage.calls,
      toolCallCount: usage.calls.length,
      turns: convo.turns,
      toolErrors: success.toolErrors,
      verificationFailures: success.failedVerifications,
      transferInvoked: usage.calls.includes("transfer_to_human"),
      missingRequired: usage.missingRequired,
      forbiddenUsed: usage.forbiddenUsed,
      unconfirmedActions: state.unconfirmed,
      endsWithQuestion: convo.endsWithQuestion,
    },
    systemState,
    toolScore,
  };
}
