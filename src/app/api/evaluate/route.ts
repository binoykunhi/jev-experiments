import { getScenario } from "@/data/scenarios";
import { evaluateScenario } from "@/lib/evaluate";

// The TypeSafe key is only ever read on the server, inside lib/semantic.ts.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { scenarioId?: string } | null;
  const scenario = body?.scenarioId ? getScenario(body.scenarioId) : undefined;
  if (!scenario) return Response.json({ error: "Unknown scenarioId" }, { status: 404 });
  return Response.json(await evaluateScenario(scenario));
}
