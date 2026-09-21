from types import SimpleNamespace as NS

from ivr.routing import decide


def ans(choice="book", conf=0.95, urgent=0.01, frustrated=0.0):
    return {
        "intent": NS(choice=choice, confidence=conf),
        "urgent": NS(noul=urgent),
        "frustrated": NS(score=frustrated, confidence=0.9),
    }


def test_confident_low_stakes_acts():
    assert decide(ans("book", 0.7)).action == "act"

def test_below_floor_reprompts():
    assert decide(ans("book", 0.5)).action == "reprompt"

def test_second_miss_goes_to_human():
    assert decide(ans("book", 0.5), misses=1).action == "human"

def test_high_stakes_moderate_confidence_confirms():
    assert decide(ans("cancel", 0.75)).action == "confirm"

def test_high_stakes_high_confidence_acts():
    assert decide(ans("cancel", 0.95)).action == "act"

def test_urgent_always_human():
    assert decide(ans("book", 0.99, urgent=0.9)).action == "human"

def test_frustrated_after_miss_escalates():
    assert decide(ans("book", 0.9, frustrated=2.0), misses=1).action == "human"

def test_other_reprompts():
    assert decide(ans("other", 0.9)).action == "reprompt"
