import { supabase } from "./supabaseClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export type ReportSummary = {
  id: string;
  query: string;
  created_at: string;
};

export type ResearcherFinding = {
  sub_question: string;
  answer: string;
  sources: { title: string; url: string }[];
};

export type ReportDetail = {
  id: string;
  query: string;
  sub_questions: string[];
  result: string;
  created_at: string;
  // Present only when the 3-agent (web search) pipeline ran.
  researcher_findings: ResearcherFinding[];
};

export async function createReport(query: string): Promise<ReportDetail> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listReports(): Promise<ReportSummary[]> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}/reports`, { headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function getReport(id: string): Promise<ReportDetail> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}/reports/${id}`, { headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
