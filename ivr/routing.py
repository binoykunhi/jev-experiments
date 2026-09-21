"""Confidence-gated routing. Pure functions over Jev answers, so they are easy to test.

Dates, times and counts are never decided here or by Jev; extract them in code.
"""
from dataclasses import dataclass

FLOOR = 0.6          # below this on the intent, we do not act
HIGH_STAKES = 0.85   # needed to act without reading back
HIGH_STAKES_INTENTS = {"cancel", "refill"}
LOW_STAKES_INTENTS = {"book", "reschedule", "billing", "hours"}
URGENT_NOUL = 0.7
FRUSTRATED_SCORE = 1.5
MAX_MISSES = 2


@dataclass
class Decision:
    action: str   # act | confirm | reprompt | human
    intent: str | None
    reason: str


def decide(answers, misses: int = 0) -> Decision:
    intent = answers["intent"]
    urgent = answers["urgent"].noul
    frustrated = answers["frustrated"].score

    if urgent >= URGENT_NOUL:
        return Decision("human", intent.choice, f"urgent={urgent:.2f}")
    if intent.choice == "human":
        return Decision("human", "human", "caller asked for a person")
    if frustrated >= FRUSTRATED_SCORE and misses >= 1:
        return Decision("human", intent.choice, f"frustrated={frustrated:.1f} after a miss")

    if intent.confidence < FLOOR or intent.choice == "other":
        if misses + 1 >= MAX_MISSES:
            return Decision("human", intent.choice, "too many misses")
        return Decision("reprompt", intent.choice, f"confidence={intent.confidence:.2f}")

    if intent.choice in HIGH_STAKES_INTENTS and intent.confidence <= HIGH_STAKES:
        return Decision("confirm", intent.choice, f"high stakes, confidence={intent.confidence:.2f}")

    return Decision("act", intent.choice, f"confidence={intent.confidence:.2f}")
