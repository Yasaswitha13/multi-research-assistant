import { handleOptions, json } from "../_shared/cors.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return handleOptions();
  return json({ status: "ok" });
});
