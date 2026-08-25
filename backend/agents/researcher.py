import asyncio
from search import web_search
from llm import call_llm

SYNTHESIS_SYSTEM = """You are a research assistant. You are given a sub-question and a set of \
web search results (title, url, and a content snippet for each). Write a 2-4 sentence answer \
to the sub-question based ONLY on these search results — do not use outside knowledge. If the \
results don't clearly answer the sub-question, say so briefly rather than guessing.

Do not fabricate facts not present in the search results. Do not quote long passages verbatim;
summarize in your own words."""


async def _research_one(sub_question: str) -> dict:
    results = await web_search(sub_question)

    if not results:
        return {
            "sub_question": sub_question,
            "answer": "No search results were found for this sub-question.",
            "sources": [],
        }

    results_text = "\n\n".join(
        f"[{i+1}] {r['title']}\n{r['url']}\n{r['content']}" for i, r in enumerate(results)
    )
    prompt = f"Sub-question: {sub_question}\n\nSearch results:\n{results_text}"

    answer = await call_llm(SYNTHESIS_SYSTEM, prompt)

    return {
        "sub_question": sub_question,
        "answer": answer,
        "sources": [{"title": r["title"], "url": r["url"]} for r in results],
    }


async def research_sub_questions(sub_questions: list[str]) -> list[dict]:
    """
    Runs a real web search per sub-question (in parallel) and synthesizes each into a
    grounded answer with source links. This is the Researcher agent: Planner hands it
    sub-questions, it hands the Writer agent findings + citations.
    """
    return await asyncio.gather(*(_research_one(sq) for sq in sub_questions))
