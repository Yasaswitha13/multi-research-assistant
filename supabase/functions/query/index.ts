import { handleOptions, json } from "../_shared/cors.ts";
import { AuthError, getUserID } from "../_shared/auth.ts";
import { callLLM } from "../_shared/llm.ts";
import { webSearch } from "../_shared/search.ts";

const PLANNER_SYSTEM = `You are a research planner. Given a user's question or topic, break it \
down into 3 to 4 focused sub-questions that, together, would let someone fully answer the \
original question.

Rules:
- Sub-questions must be specific and non-overlapping.
- Order them so answering them in sequence builds toward the full picture.
- Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"sub_questions": ["...", "...", "..."]}`;

const SYNTHESIS_SYSTEM = `You are a research assistant. You are given a sub-question and a set of \
web search results (title, url, and a content snippet for each). Write a 2-4 sentence answer \
to the sub-question based ONLY on these search results — do not use outside knowledge. If the \
results don't clearly answer the sub-question, say so briefly rather than guessing.

Do not fabricate facts not present in the search results. Do not quote long passages verbatim;
summarize in your own words.`;

const COMPILE_SYSTEM = `You are a technical writer. You are given an original question and a set \
of sub-questions, each with a research finding that was already grounded in web search results. \
Write a single clean, well-structured report in Markdown that synthesizes these findings into a \
coherent whole for the original question.

Structure:
- A one-paragraph summary at the top that directly answers the original question.
- A section per sub-question (use the sub-question as a heading, in your own words if it reads \
awkwardly as a heading), presenting that finding as prose.
- A short "Bottom line" section at the end with the single most important takeaway.

Do not fabricate any claim beyond what the findings state. Do not include a Sources section \
yourself — that is added separately after your report.`;

function extractSubQuestions(text: string): string[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  let data: { sub_questions?: unknown } | null = null;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        data = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        data = null;
      }
    }
  }
  if (!data || !Array.isArray(data.sub_questions) || data.sub_questions.length === 0) {
    throw new Error("Planner did not return a valid sub_questions list");
  }
  return data.sub_questions.map(String);
}

async function planSubQuestions(query: string): Promise<string[]> {
  let last: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callLLM(PLANNER_SYSTEM, `Question or topic: ${query}`, {
        temperature: 0.3 + attempt * 0.2,
        maxTokens: 600,
      });
      return extractSubQuestions(raw);
    } catch (e) {
      last = e;
    }
  }
  // Last resort so the pipeline still produces a report instead of failing.
  console.error("planner fallback to raw query:", String(last));
  return [query];
}

async function researchOne(subQuestion: string): Promise<{
  sub_question: string;
  answer: string;
  sources: { title: string; url: string }[];
}> {
  const results = await webSearch(subQuestion, 4);
  if (results.length === 0) {
    return { sub_question: subQuestion, answer: "No search results were found for this sub-question.", sources: [] };
  }
  const resultsText = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");
  const answer = await callLLM(SYNTHESIS_SYSTEM, `Sub-question: ${subQuestion}\n\nSearch results:\n${resultsText}`, {
    maxTokens: 400,
  });
  return {
    sub_question: subQuestion,
    answer,
    sources: results.map((r) => ({ title: r.title, url: r.url })),
  };
}

function buildSourcesSection(findings: { sources: { title: string; url: string }[] }[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const f of findings) {
    for (const s of f.sources) {
      if (s.url && !seen.has(s.url)) {
        seen.add(s.url);
        lines.push(`- [${s.title}](${s.url})`);
      }
    }
  }
  return lines.length ? `\n\n## Sources\n${lines.join("\n")}` : "";
}

async function compileReport(query: string, findings: { sub_question: string; answer: string }[]): Promise<string> {
  const findingsText = findings.map((f) => `Sub-question: ${f.sub_question}\nFinding: ${f.answer}`).join("\n\n");
  const report = await callLLM(COMPILE_SYSTEM, `Original question: ${query}\n\n${findingsText}`, {
    temperature: 0.5,
    maxTokens: 1600,
  });
  return report + buildSourcesSection(findings);
}

async function saveReport(
  userId: string,
  query: string,
  subQuestions: string[],
  result: string,
  findings: unknown[],
): Promise<Record<string, unknown>> {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const key = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const resp = await fetch(`${base}/rest/v1/reports`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      query,
      sub_questions: subQuestions,
      result,
      researcher_findings: findings,
    }),
  });
  if (!resp.ok) throw new Error(`save report ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const rows = (await resp.json()) as Record<string, unknown>[];
  return rows[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const userId = await getUserID(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? "").trim();
    if (!query) return json({ error: "query must not be empty" }, 400);

    const subQuestions = await planSubQuestions(query);
    const findings = await Promise.all(subQuestions.map(researchOne));
    const result = await compileReport(query, findings);
    const saved = await saveReport(userId, query, subQuestions, result, findings);
    return json(saved);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, 401);
    console.error("query error:", e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
