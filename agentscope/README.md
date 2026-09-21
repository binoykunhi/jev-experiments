# AgentScope: AI Agent Flight Recorder & Evals

A showcase MVP for contact-center and voice-AI audiences. It answers one question:

> Observability tells you whether the agent is running. AgentScope tells you whether it's doing its job.

Two pages, driven entirely by local JSON scenarios (no database, auth or telephony):

- `/flight-recorder`: replays a call (conversation, tool calls, tool results), runs deterministic + semantic evals, and shows a failure timeline and an Agent Quality score.
- `/regression`: "Would I ship Agent v1.8?" Compares two agent versions over the same customer journeys. **This page uses precomputed fixtures** (`src/data/regression.json`); it does not run live evals.

## Run it

```bash
cp .env.example .env.local   # DEMO_MODE=true works with no key
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

## Demo mode vs live Jev

| Setting | Behaviour |
| --- | --- |
| `DEMO_MODE=true` (or no `TYPESAFE_API_KEY`) | Recorded evaluator answers from each scenario's `demoSemantic`, captured from real Jev 1.13 runs (re-record them after changing the questions). No network. The UI shows a **DEMO MODE · RECORDED** badge. |
| `DEMO_MODE=false` + `TYPESAFE_API_KEY=...` | One live call to TypeSafe per run. The UI shows **LIVE · JEV** with the measured round-trip time. |
| Live call fails | Falls back to recorded answers and says so in the UI (**LIVE CALL FAILED · RECORDED**). |

Get a key at https://console.typesafe.ai/keys. The key is read only on the server (`src/lib/semantic.ts`, imported with `server-only`), never sent to the browser.

## How the evaluation works

**Deterministic evals** (`src/lib/deterministic.ts`): anything checkable in code is checked in code: `evaluateToolUsage()` (required/forbidden tools), `evaluateToolSuccess()` (SUCCESS/FAILED/TIMEOUT), `evaluateSystemState()` (did the backend record the action, e.g. `refund_created`), turn counts, failed verification attempts. Jev 1.13 is unreliable at counting and comparing, so these facts are computed here and handed to Jev as `system_state`.

**Semantic evals via TypeSafe / Jev** (`src/lib/semantic.ts`): six atomic questions sent in **one** `client.systemOne({ state, questions })` call using the official `@typesafe-ai/sdk`:

| Question | Type |
| --- | --- |
| `intent_understood` | noul |
| `response_grounded` | noul |
| `task_completion` | score (4 levels) |
| `handoff_decision` | choice (continue / clarify / transfer_to_human) |
| `unnecessary_repetition` | noul |
| `agent_action_correctness` | noul |

Jev receives the full agent state (request, conversation, tools available, tool calls, tool results, policy, system state, final response), not just the transcript. Probabilities and confidence are preserved and shown in the UI.

**The CRITICAL verdict** (`src/lib/evaluate.ts`) fires when both are true: a required side-effect action never succeeded (deterministic) **and** Jev judges the final response ungrounded (`response_grounded < 0.5`). An agent that honestly says "I can't confirm the refund" after a timeout is *not* flagged.

**Agent Quality** (`src/lib/scoring.ts`) is computed in code from atomic metrics (task 30%, action correctness 25%, groundedness 20%, handoff 10%, understanding 10%, efficiency 5%). Jev is never asked for an overall grade.

## Where TypeSafe/Jev is invoked

Only in `runSemantic()` in `src/lib/semantic.ts`, called from `evaluateScenario()` in `src/lib/evaluate.ts`, called from the `POST /api/evaluate` route.

## Add a scenario

1. Copy any file in `src/data/scenarios/` (e.g. `02-hallucinated-refund.json`).
2. Edit `id`, `name`, `events` (customer / agent / tool_call / tool_result), `tools` (mark real-world actions `"sideEffect": true` with a `stateKey` and `noun`), `policy`, `systemState`, and `expectations` (`requiredTools`, `forbiddenTools`, `idealTurns`).
3. Fill `demoSemantic` with the answers you want in demo mode (noul values are p(yes); `task_completion.probabilities` has one entry per rubric level).
4. Import it and add it to the array in `src/data/scenarios/index.ts`.

## Change the evaluator questions

Edit the `questions` object at the top of `src/lib/semantic.ts`. If you add or rename a question, also update `SemanticAnswers` in `src/lib/types.ts`, the normalisation in `runSemantic()`, the rows in `buildItems()` (`src/lib/evaluate.ts`), the weights in `src/lib/scoring.ts`, and `demoSemantic` in each scenario.

## Caveats

- Live mode was verified against a local mock of the TypeSafe API (request shape, response parsing, failure fallback). It has not been run against the real API from this repo, so expect to tune question wording against real Jev outputs.
- Jev's known limits (literal reading, weak counting/date maths, no text generation) are why derived facts are computed in code. See https://docs.typesafe.ai/model-jaggedness/jev-1.13.
