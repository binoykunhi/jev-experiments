"""The question set sent to Jev on every caller utterance (one fan-out call)."""
from typesafe_sdk import Choice, Noul, Score

INTENTS = {
    "book": "Caller wants to book a new appointment",
    "reschedule": "Caller wants to move an existing appointment to another time",
    "cancel": "Caller wants to cancel an existing appointment",
    "refill": "Caller wants a prescription refill",
    "billing": "Caller has a question about a bill or payment",
    "hours": "Caller asks for opening hours or location",
    "human": "Caller explicitly asks for a person or an operator",
    "other": "Anything else, or unclear",
}


def build_questions() -> dict:
    return {
        "intent": Choice(
            instructions="What does the caller want to do?",
            criteria=INTENTS,
        ),
        "urgent": Noul(
            instructions="Does the caller describe a medical emergency or severe symptoms that need immediate attention?",
        ),
        "frustrated": Score(
            instructions="How frustrated is the caller?",
            criteria=[
                "Calm or neutral",
                "Mildly annoyed or impatient",
                "Clearly angry or fed up",
            ],
        ),
    }
