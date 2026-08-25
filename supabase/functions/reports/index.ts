import { handleOptions, json } from "../_shared/cors.ts";
import { AuthError, getUserID } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const userId = await getUserID(req.headers.get("Authorization"));
    const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
    const key = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const path = new URL(req.url).pathname;
    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const isList = req.method === "GET" && last === "reports";
    const id = isList ? undefined : last || undefined;

    if (req.method === "GET" && !id) {
      const resp = await fetch(
        `${base}/rest/v1/reports?select=id,query,created_at&user_id=eq.${userId}&order=created_at.desc`,
        { headers },
      );
      if (!resp.ok) return json({ error: `db error ${resp.status}` }, 500);
      return json(await resp.json());
    }

    if (req.method === "GET" && id) {
      const resp = await fetch(`${base}/rest/v1/reports?select=*&user_id=eq.${userId}&id=eq.${id}`, { headers });
      if (!resp.ok) return json({ error: `db error ${resp.status}` }, 500);
      const rows = (await resp.json()) as unknown[];
      if (rows.length === 0) return json({ error: "Report not found" }, 404);
      return json(rows[0]);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, 401);
    console.error("reports error:", e instanceof Error ? e.message : String(e));
    return json({ error: "Internal error" }, 500);
  }
});
