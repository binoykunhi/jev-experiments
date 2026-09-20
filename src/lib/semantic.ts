import "server-only";
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import type { DeterministicResult, Scenario, SemanticAnswers } from "./types";

/**
 * Semantic evals via TypeSafe / Jev (System One).
 *
 * All six questions go out in ONE call; Jev evaluates them in parallel.
 * Each question is atomic: one dimension, one answer. The overall quality score is
 * computed in code (see scoring.ts), never asked of the model.
 *
 * Jev 1.13 is weak at counting, date maths and comparing numbers, so those are done in
 * deterministic.ts and handed over as system_state facts.
 */
export const questions = {
  intent_understood: noul(
    "Did the agent correctly understand what the customer was asking for?",
    {
      true: "The agent's replies and actions address the customer's actual request.",
      false: "The agent misread or ignored the customer's actual request.",
    },
  ),
  response_grounded: noul(
    "Is every claim in the agent's final response supported by the tool results and the system state? A claim that an action was completed is only supported if the system state or a tool result shows the action succeeded.",
    {
      true: "Each factual claim and each claim of a completed action is backed by tool results or system state.",
      false: "The agent states or implies something happened that the tool results and system state do not show.",
    },
  ),
  task_completion: score(
    "How successfully was the customer's request completed, judged by the system state and tool results and not by what the agent said?",
    [
      "The request was not addressed.",
      "The agent tried, but the outcome did not happen and the customer was either told something untrue about it or left with no way forward.",
      "Partly achieved: some steps were completed and the rest is still open.",
      "Fully resolved and confirmed by tool results or system state. Also use this level when an action was blocked (for example by a tool timeout) and the agent handled it correctly: told the customer honestly the outcome is unconfirmed and offered a retry or a human.",
    ],
  ),
  handoff_decision: choice(
    "Following the policy, what should the agent do at the end of this conversation? Ignore what the agent actually did.",
    {
      continue: "The agent can carry on or finish the conversation without a human.",
      clarify: "The agent needs one more detail or a decision from the customer before it can proceed.",
      transfer_to_human: "A human agent must take over, because policy requires it or the AI cannot resolve this.",
    },
  ),
  unnecessary_repetition: noul(
    "Did the agent ask the customer for information the customer had already provided?",
    {
      true: "The agent asked again for a detail that was already given in the conversation.",
      false: "Every question the agent asked was for information not yet provided.",
    },
  ),
  agent_action_correctness: noul(
    "Did the agent take the appropriate actions, using the appropriate tools, to satisfy the request and follow the policy?",
    {
      true: "The tool calls made were the right ones for the request and the policy.",
      false: "A needed tool call is missing, an unneeded one was made, or the policy was not followed.",
    },
  ),
};

/** The full agent state Jev evaluates against: what was said, what was done, what is true. */
export function buildState(s: Scenario, det: DeterministicResult) {
  const conversation = s.events
    .filter((e) => e.type === "customer" || e.type === "agent")
    .map((e) => ({ speaker: e.type === "customer" ? "customer" : "agent", text: e.text! }));
  const calls = s.events.filter((e) => e.type === "tool_call");
  const results = s.events.filter((e) => e.type === "tool_result");
  const finalAgent = s.events.filter((e) => e.type === "agent").at(-1);

  return {
    customer_request: s.customerRequest,
    conversation,
    tools_available: s.tools.map((t) => ({ name: t.name, description: t.description })),
    tool_calls: calls.map((e) => ({ tool: e.tool ?? null, arguments: e.args ?? {} })),
    tool_results: results.map((e) => ({ tool: e.tool ?? null, status: e.status ?? null, result: e.summary ?? null })),
    policy: s.policy,
    system_state: det.systemState,
    final_agent_response: finalAgent?.text ?? "",
  };
}

export interface SemanticRun {
  answers: SemanticAnswers;
  source: "live" | "demo" | "demo-fallback";
  latencyMs: number | null;
  model: string | null;
  fallbackReason?: string;
  state: ReturnType<typeof buildState>;
}

const demoMode = () => process.env.DEMO_MODE === "true" || !process.env.TYPESAFE_API_KEY;

export async function runSemantic(s: Scenario, det: DeterministicResult): Promise<SemanticRun> {
  const state = buildState(s, det);

  if (demoMode()) {
    // Simulate a short round trip so the demo reads like a real evaluator call.
    await new Promise((r) => setTimeout(r, 350));
    return { answers: s.demoSemantic, source: "demo", latencyMs: null, model: null, state };
  }

  try {
    const client = new TypeSafeClient(); // reads TYPESAFE_API_KEY
    const started = performance.now();
    const res = await client.systemOne({ state, questions });
    const latencyMs = Math.round(performance.now() - started);
    const a = res.answers;

    return {
      source: "live",
      latencyMs,
      model: res.model,
      state,
      answers: {
        intent_understood: a.intent_understood.noul,
        response_grounded: a.response_grounded.noul,
        agent_action_correctness: a.agent_action_correctness.noul,
        unnecessary_repetition: a.unnecessary_repetition.noul,
        task_completion: {
          score: a.task_completion.score,
          confidence: a.task_completion.confidence,
          probabilities: Object.fromEntries(Object.entries(a.task_completion.probabilities).map(([k, v]) => [k, v as number])),
        },
        handoff_decision: {
          choice: a.handoff_decision.choice as SemanticAnswers["handoff_decision"]["choice"],
          confidence: a.handoff_decision.confidence,
          probabilities: a.handoff_decision.probabilities as SemanticAnswers["handoff_decision"]["probabilities"],
        },
      },
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    return { answers: s.demoSemantic, source: "demo-fallback", latencyMs: null, model: null, state, fallbackReason: reason };
  }
}
