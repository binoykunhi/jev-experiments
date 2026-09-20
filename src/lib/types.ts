export type Level = "PASS" | "WARNING" | "FAIL" | "CRITICAL";
export type Status = "pass" | "warn" | "fail";

export type ToolStatus = "SUCCESS" | "FAILED" | "TIMEOUT";
export type ArgValue = string | number | boolean;

export interface ToolDef {
  name: string;
  description: string;
  /** Changes the outside world (refund, transfer of funds...). Claims about these need evidence. */
  sideEffect: boolean;
  /** Key in the scenario system state that proves the action happened. */
  stateKey?: string;
  /** Human noun used in failure messages, e.g. "refund". */
  noun?: string;
}

export interface TraceEvent {
  /** Seconds from the start of the call. */
  t: number;
  type: "customer" | "agent" | "tool_call" | "tool_result";
  text?: string;
  tool?: string;
  args?: Record<string, ArgValue>;
  status?: ToolStatus;
  summary?: string;
}

export type Decision = "continue" | "clarify" | "transfer_to_human";

/** Semantic answers, normalised from either live Jev output or recorded demo fixtures. */
export interface SemanticAnswers {
  intent_understood: number;
  response_grounded: number;
  agent_action_correctness: number;
  unnecessary_repetition: number;
  task_completion: {
    score: number;
    confidence: number;
    probabilities: Record<string, number>;
  };
  handoff_decision: {
    choice: Decision;
    confidence: number;
    probabilities: Record<Decision, number>;
  };
}

export interface Scenario {
  id: string;
  name: string;
  tagline: string;
  expected: { level: Level; label: string };
  intentLabel: string;
  customerRequest: string;
  tools: ToolDef[];
  policy: string[];
  /** State as reported by the backend systems at the end of the call. */
  systemState: Record<string, ArgValue>;
  events: TraceEvent[];
  expectations: {
    requiredTools: string[];
    forbiddenTools: string[];
    idealTurns: number;
  };
  /** Recorded evaluator answers, used when DEMO_MODE is on or the live call fails. */
  demoSemantic: SemanticAnswers;
}

export interface DetCheck {
  id: string;
  label: string;
  status: Status;
  detail: string;
}

export interface DeterministicResult {
  checks: DetCheck[];
  facts: {
    toolCalls: string[];
    toolCallCount: number;
    turns: number;
    toolErrors: number;
    verificationFailures: number;
    transferInvoked: boolean;
    missingRequired: string[];
    forbiddenUsed: string[];
    /** Side-effect actions that were required but never succeeded. */
    unconfirmedActions: { tool: string; reason: "not_called" | ToolStatus }[];
    endsWithQuestion: boolean;
  };
  /** Backend state plus facts derived in code, this is what the semantic evaluator sees. */
  systemState: Record<string, ArgValue>;
  /** 0-1: share of required tools that were called and succeeded, minus forbidden usage. */
  toolScore: number;
}

export interface EvalItem {
  id: string;
  label: string;
  status: Status;
  /** Confidence in the shown verdict, 0-1. */
  confidence: number;
  detail: string;
  /** Raw evaluator value, shown small for transparency. */
  raw: string;
  /** Show once this many trace events have played. */
  revealAt: number;
}

export interface Verdict {
  level: Level;
  label: string;
  headline: string;
  expected?: string;
  actual?: string;
  systemState?: string;
  reason?: string;
}

export interface QualityBreakdown {
  key: string;
  label: string;
  weight: number;
  value: number;
}

export interface QualityResult {
  score: number;
  level: Level;
  breakdown: QualityBreakdown[];
  issue?: string;
}

export interface TimelineEntry {
  t: number;
  title: string;
  subtitle?: string;
  status: Status | "critical" | "info";
  revealAt: number;
  detail?: { expected?: string; actual?: string; systemState?: string; reason?: string };
}

export type ReportSource = "live" | "demo" | "demo-fallback";

export interface EvaluationReport {
  scenarioId: string;
  source: ReportSource;
  fallbackReason?: string;
  latencyMs: number | null;
  model: string | null;
  state: unknown;
  deterministic: DeterministicResult;
  semantic: SemanticAnswers;
  items: EvalItem[];
  verdict: Verdict;
  quality: QualityResult;
  timeline: TimelineEntry[];
}
