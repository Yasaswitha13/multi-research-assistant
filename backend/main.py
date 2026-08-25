import os
from dotenv import load_dotenv

load_dotenv()  # loads .env for local dev; Render sets real env vars in production

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import get_current_user_id
from db import save_report, list_reports, get_report
from graph import run_research_pipeline

app = FastAPI(title="Multi-Agent Research Assistant API")

# FRONTEND_ORIGIN may be a comma-separated list (e.g. deployed URL + localhost).
# Always include the two local dev origins so the app works from both
# http://localhost:3000 and http://127.0.0.1:3000.
origins = sorted(
    set(
        [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if o.strip()]
        + ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str


class ReportResponse(BaseModel):
    id: str
    query: str
    sub_questions: list[str]
    result: str
    created_at: str
    # Populated only when the 3-agent (web search) pipeline ran; empty list otherwise.
    researcher_findings: list[dict] = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/query", response_model=ReportResponse)
async def create_report(body: QueryRequest, user_id: str = Depends(get_current_user_id)):
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query must not be empty")

    state = await run_research_pipeline(query)

    saved = save_report(
        user_id=user_id,
        query=query,
        sub_questions=state["sub_questions"],
        result=state["report"],
        researcher_findings=state.get("researcher_findings", []),
    )
    return saved


@app.get("/reports")
def get_reports(user_id: str = Depends(get_current_user_id)):
    """Lightweight list for the history view: id, query, created_at only."""
    return list_reports(user_id)


@app.get("/reports/{report_id}", response_model=ReportResponse)
def get_single_report(report_id: str, user_id: str = Depends(get_current_user_id)):
    report = get_report(user_id, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
