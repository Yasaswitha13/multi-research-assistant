import asyncio
import os

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def _headers() -> dict:
    api_key = os.environ["OPENROUTER_API_KEY"]
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # OpenRouter uses these two headers for attribution / free-tier routing.
        "HTTP-Referer": os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"),
        "X-Title": "Multi-Agent Research Assistant",
    }


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.4,
    max_retries: int = 3,
) -> str:
    """Call an OpenRouter chat model, retrying transient failures with backoff.

    Free-tier models return 429 when overloaded or rate-limited; a short
    exponential backoff (honoring Retry-After when present) usually clears it.
    """
    model = os.environ.get("OPENROUTER_MODEL", "openrouter/free")
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
    }

    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                resp = await client.post(OPENROUTER_URL, headers=_headers(), json=body)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except (httpx.HTTPStatusError, httpx.TransportError) as e:
            last_exc = e
            if attempt == max_retries - 1:
                break
            delay = 2.0 * (2**attempt)  # 2s, 4s, then give up
            response = getattr(e, "response", None)
            if response is not None and response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    delay = max(delay, min(float(retry_after), 30.0))
            await asyncio.sleep(delay)

    raise last_exc  # type: ignore[misc] - always set after the loop


def clean_json_block(raw: str) -> str:
    """Strips markdown code fences if the model wraps its JSON in ```json ... ```"""
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()
