from llm import call_llm

# --- LLM-only mode (no web search) -----------------------------------------
# Used when researcher_findings is not provided — the Writer answers each
# sub-question itself via reasoning, then compiles. This is the 2-agent
# fallback path (Planner -> Writer only).

ANSWER_SYSTEM = """You are a research assistant. Answer the given sub-question clearly and \
accurately, using your own knowledge and reasoning. Write 2-4 sentences. Do not pad with \
filler, and do not repeat the question back."""

COMPILE_SYSTEM = """You are a technical writer. You are given an original question and a set \
of sub-questions with their answers. Write a single clean, well-structured report in Markdown \
that synthesizes them into a coherent whole for the original question.

Structure:
- A one-paragraph summary at the top that directly answers the original question.
- A section per sub-question (use the sub-question as a heading, in your own words if it reads \
awkwardly as a heading).
- A short "Bottom line" section at the end with the single most important takeaway.

Do not just restate the sub-question/answer pairs verbatim — synthesize them into prose."""

# --- Web-search mode (3-agent pipeline) -------------------------------------
# Used when researcher_findings IS provided (list of {sub_question, answer, sources}
# from agents/researcher.py). The Writer compiles from grounded findings and adds
# a Sources section instead of generating its own answers.

COMPILE_WITH_SOURCES_SYSTEM = """You are a technical writer. You are given an original \
question and a set of sub-questions, each with a research finding that was already grounded \
in web search results. Write a single clean, well-structured report in Markdown that \
synthesizes these findings into a coherent whole for the original question.

Structure:
- A one-paragraph summary at the top that directly answers the original question.
- A section per sub-question (use the sub-question as a heading, in your own words if it reads \
awkwardly as a heading), presenting that finding as prose.
- A short "Bottom line" section at the end with the single most important takeaway.

Do not fabricate any claim beyond what the findings state. Do not include a Sources section
yourself — that is added separately after your report."""


import asyncio


async def _answer_one(sub_question: str) -> str:
    return await call_llm(ANSWER_SYSTEM, f"Sub-question: {sub_question}")


async def answer_and_compile(query: str, sub_questions: list[str]) -> str:
    """2-agent path: Writer answers each sub-question itself (no search), then compiles."""
    answers = await asyncio.gather(*(_answer_one(sq) for sq in sub_questions))

    pairs_text = "\n\n".join(
        f"Sub-question: {sq}\nAnswer: {a}" for sq, a in zip(sub_questions, answers)
    )
    compile_prompt = f"Original question: {query}\n\n{pairs_text}"

    report = await call_llm(COMPILE_SYSTEM, compile_prompt, temperature=0.5)
    return report


async def compile_from_research(query: str, researcher_findings: list[dict]) -> str:
    """
    3-agent path: Writer compiles a report from the Researcher agent's grounded
    findings (each with a sub_question, answer, and sources list), then appends
    a deduplicated Sources section built from real URLs — not LLM-generated.
    """
    findings_text = "\n\n".join(
        f"Sub-question: {f['sub_question']}\nFinding: {f['answer']}"
        for f in researcher_findings
    )
    compile_prompt = f"Original question: {query}\n\n{findings_text}"

    report = await call_llm(COMPILE_WITH_SOURCES_SYSTEM, compile_prompt, temperature=0.5)

    # Build the Sources section from real search results, not the LLM, to avoid
    # fabricated links.
    seen_urls = set()
    source_lines = []
    for f in researcher_findings:
        for s in f["sources"]:
            if s["url"] not in seen_urls:
                seen_urls.add(s["url"])
                source_lines.append(f"- [{s['title']}]({s['url']})")

    if source_lines:
        report += "\n\n## Sources\n" + "\n".join(source_lines)

    return report
