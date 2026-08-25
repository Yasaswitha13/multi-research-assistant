import json

from llm import call_llm, clean_json_block

PLANNER_SYSTEM = """You are a research planner. Given a user's question or topic, break it \
down into 3 to 4 focused sub-questions that, together, would let someone fully answer the \
original question.

Rules:
- Sub-questions must be specific and non-overlapping.
- Order them so answering them in sequence builds toward the full picture.
- Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"sub_questions": ["...", "...", "..."]}
"""

MAX_ATTEMPTS = 3


def _extract_sub_questions(text: str) -> list[str]:
    """Parse the sub-questions list from LLM output, tolerating stray preamble.

    Tries strict JSON first, then the first {...} block, so brief model
    chatter around the JSON doesn't break the pipeline.
    """
    cleaned = clean_json_block(text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end <= start:
            raise
        data = json.loads(cleaned[start : end + 1])

    sub_questions = data["sub_questions"]
    if not isinstance(sub_questions, list) or not sub_questions:
        raise ValueError("Planner did not return a valid sub_questions list")
    return sub_questions


async def plan_sub_questions(query: str) -> list[str]:
    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        # API-level failures (429/5xx/network) propagate — call_llm already
        # retried them with backoff, and re-prompting won't help. Only a
        # malformed response gets another attempt with varied temperature.
        raw = await call_llm(PLANNER_SYSTEM, f"Question or topic: {query}", temperature=0.3 + attempt * 0.2)
        try:
            return _extract_sub_questions(raw)
        except Exception as e:  # noqa: BLE001 - parse/validation failure, retry
            last_error = e

    # Last resort: treat the whole query as one sub-question so the pipeline
    # still produces a report instead of failing with a 500.
    print(f"planner: LLM returned invalid JSON after {MAX_ATTEMPTS} attempts ({last_error}); falling back to the raw query")
    return [query]
