/**
 * LLM access for the agents.
 *
 * Primary provider: Hugging Face Inference (OpenAI-compatible router) using the
 * account's HF token — free, generous quota, no credit card.
 * Fallback provider: OpenRouter (same API shape) using the project's existing key.
 */

export interface LLMMessage {
  role: "system" | "user";
  content: string;
}

async function postChat(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (resp.status === 429 || resp.status >= 500) {
        const retryAfter = resp.headers.get("retry-after");
        const base = 2 * 2 ** attempt;
        const delay = retryAfter && !Number.isNaN(Number(retryAfter))
          ? Math.min(Number(retryAfter), 30)
          : base;
        await new Promise((r) => setTimeout(r, delay * 1000));
        continue;
      }
      if (!resp.ok) {
        const text = (await resp.text()).slice(0, 300);
        throw new Error(`LLM ${resp.status}: ${text}`);
      }
      const data = await resp.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2 * 2 ** attempt * 1000));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function callLLM(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const temperature = opts.temperature ?? 0.4;
  const max_tokens = opts.maxTokens ?? 1200;

  const hfToken = Deno.env.get("HF_TOKEN");
  if (hfToken) {
    const model = Deno.env.get("HF_MODEL") || "Qwen/Qwen2.5-7B-Instruct";
    try {
      return await postChat(
        "https://router.huggingface.co/v1/chat/completions",
        { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        { model, messages, temperature, max_tokens },
      );
    } catch (e) {
      console.error("HF inference failed, falling back to OpenRouter:", String(e));
    }
  }

  const orKey = Deno.env.get("OPENROUTER_API_KEY");
  if (orKey) {
    const model = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";
    return await postChat(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://huggingface.co",
        "X-Title": "Multi-Agent Research Assistant",
      },
      { model, messages, temperature, max_tokens },
    );
  }

  throw new Error("No LLM provider configured (set HF_TOKEN or OPENROUTER_API_KEY)");
}
