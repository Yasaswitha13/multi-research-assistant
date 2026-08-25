import os
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
        )
    return _client


def save_report(
    user_id: str,
    query: str,
    sub_questions: list[str],
    result: str,
    researcher_findings: list[dict] | None = None,
) -> dict:
    client = get_client()
    response = (
        client.table("reports")
        .insert(
            {
                "user_id": user_id,
                "query": query,
                "sub_questions": sub_questions,
                "result": result,
                "researcher_findings": researcher_findings or [],
            }
        )
        .execute()
    )
    return response.data[0]


def list_reports(user_id: str) -> list[dict]:
    client = get_client()
    response = (
        client.table("reports")
        .select("id, query, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def get_report(user_id: str, report_id: str) -> dict | None:
    client = get_client()
    response = (
        client.table("reports")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", report_id)
        .maybe_single()
        .execute()
    )
    return response.data if response else None
