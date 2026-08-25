import os
from typing import TypedDict
from langgraph.graph import StateGraph, END

from agents.planner import plan_sub_questions
from agents.researcher import research_sub_questions
from agents.writer import answer_and_compile, compile_from_research


class ResearchState(TypedDict):
    query: str
    sub_questions: list[str]
    researcher_findings: list[dict]
    report: str


def _search_enabled() -> bool:
    """
    3-agent mode (Planner -> Researcher -> Writer) turns on automatically once a
    TAVILY_API_KEY is set. Without it, the pipeline falls back to the 2-agent
    mode (Planner -> Writer) with the Writer reasoning out each sub-question itself.
    This means the same codebase works for both project versions -- just add the
    key when you're ready for the stretch goal.
    """
    return bool(os.environ.get("TAVILY_API_KEY"))


async def planner_node(state: ResearchState) -> ResearchState:
    sub_questions = await plan_sub_questions(state["query"])
    return {**state, "sub_questions": sub_questions}


async def researcher_node(state: ResearchState) -> ResearchState:
    findings = await research_sub_questions(state["sub_questions"])
    return {**state, "researcher_findings": findings}


async def writer_node_with_search(state: ResearchState) -> ResearchState:
    report = await compile_from_research(state["query"], state["researcher_findings"])
    return {**state, "report": report}


async def writer_node_no_search(state: ResearchState) -> ResearchState:
    report = await answer_and_compile(state["query"], state["sub_questions"])
    return {**state, "report": report}


def build_graph():
    graph = StateGraph(ResearchState)
    graph.add_node("planner", planner_node)
    graph.set_entry_point("planner")

    if _search_enabled():
        # 3-agent pipeline: Planner -> Researcher -> Writer
        graph.add_node("researcher", researcher_node)
        graph.add_node("writer", writer_node_with_search)
        graph.add_edge("planner", "researcher")
        graph.add_edge("researcher", "writer")
    else:
        # 2-agent pipeline: Planner -> Writer
        graph.add_node("writer", writer_node_no_search)
        graph.add_edge("planner", "writer")

    graph.add_edge("writer", END)
    return graph.compile()


research_graph = build_graph()


async def run_research_pipeline(query: str) -> ResearchState:
    """Runs the planner + (researcher, if enabled) + writer nodes end to end."""
    result = await research_graph.ainvoke(
        {"query": query, "sub_questions": [], "researcher_findings": [], "report": ""}
    )
    return result
