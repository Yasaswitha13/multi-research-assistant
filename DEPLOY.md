# Deploying — permanent public URLs

The local tunnel (`*.trycloudflare.com`) is temporary. A permanent link requires
deploying the app. This repo is deployment-ready via Render's blueprint
(`render.yaml`), which runs **both** the backend (FastAPI) and frontend (Next.js)
on Render's free tier — no credit card, permanent URLs:

- Frontend: `https://research-assistant-frontend.onrender.com`
- Backend:  `https://research-assistant-backend.onrender.com`

## Step 1 — push this repo to GitHub

The repo is initialized with `origin` = `https://github.com/rishikareddi765/research-assistant`
but was never pushed (the machine's GitHub credential has no access to that repo).
Unblock it any of these ways:

- **Best:** create a fine-grained personal access token (log in as the repo owner
  or an admin): GitHub → Settings → Developer settings → Personal access tokens →
  Fine-grained → *Only select repositories* → `rishikareddi765/research-assistant` →
  *Contents: Read and write* → Generate → use it as the password when pushing.
- Or add `akkisanirishika` as a collaborator with **Write** access and re-authenticate.

Then: `git push -u origin main`

## Step 2 — deploy with the blueprint

1. Create a free account at https://render.com (Sign up → **GitHub**).
2. Dashboard → **New → Blueprint**.
3. Paste the repo URL: `https://github.com/rishikareddi765/research-assistant`
4. When prompted, fill in the `sync: false` env values from your local files:
   - Backend (`backend/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
     `SUPABASE_JWT_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `TAVILY_API_KEY`
   - Frontend (`frontend/.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Apply**. Both services build and deploy (~5 min).
6. Done — the URLs above are permanent. Free-tier caveat: services sleep after
   ~15 min idle and take ~30 s to wake on the first request.

## Notes

- The deployed frontend calls the deployed backend directly
  (`NEXT_PUBLIC_API_URL` → `https://research-assistant-backend.onrender.com`),
  and the backend's CORS allows that origin via `FRONTEND_ORIGIN`.
- The local `/api` proxy in `frontend/next.config.js` is for local dev / tunneling only.
- Secrets stay out of the repo: `.env*` files are gitignored; the blueprint prompts
  for values at deploy time.
