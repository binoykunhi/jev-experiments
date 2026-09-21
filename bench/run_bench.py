"""Measure Jev wall-clock latency at 1, 4 and 8 questions per call.

Usage: TYPESAFE_API_KEY=... python -m bench.run_bench [repeats]
Writes bench/results.csv (one row per call) and prints p50/p95/p99 per config.
"""
import csv
import json
import statistics
import sys
import time
from pathlib import Path

from typesafe_sdk import Noul, TypeSafeClient

from ivr.questions import build_questions

HERE = Path(__file__).parent


def questions_for(n: int) -> dict:
    qs = build_questions()  # intent, urgent, frustrated
    extra = {
        f"topic_{i}": Noul(instructions=f"Does the message mention topic number {i} of an appointment call?")
        for i in range(8)
    }
    return dict(list({**qs, **extra}.items())[:n])


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, round(p / 100 * (len(xs) - 1)))]


def main(repeats: int = 3):
    client = TypeSafeClient()
    utts = json.loads((HERE / "utterances.json").read_text())
    client.system_one(state="warm-up", questions=questions_for(1))  # exclude connection setup

    rows = []
    for n in (1, 3, 8):
        qs = questions_for(n)
        for _ in range(repeats):
            for u in utts:
                t0 = time.perf_counter()
                r = client.system_one(state=u["text"], questions=qs)
                ms = (time.perf_counter() - t0) * 1000
                got = r.answers["intent"].choice if "intent" in r.answers else ""
                rows.append({"questions": n, "ms": round(ms, 1), "input_tokens": r.usage.input_tokens,
                             "expected": u["intent"], "got": got})

    with open(HERE / "results.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)

    for n in (1, 3, 8):
        ms = [r["ms"] for r in rows if r["questions"] == n]
        print(f"{n} q/call  n={len(ms)}  p50={statistics.median(ms):.0f}ms  "
              f"p95={pct(ms, 95):.0f}ms  p99={pct(ms, 99):.0f}ms")
    ok = [r for r in rows if r["questions"] >= 3]
    print(f"intent accuracy: {sum(r['expected'] == r['got'] for r in ok) / len(ok):.0%}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 3)
