# Deploying WorkforceIQ (Render + Vercel, both free tier)

This matches the split in the README: **Render** hosts the FastAPI backend + Postgres,
**Vercel** hosts the React frontend. Both have a free tier and no paid AI APIs are used
anywhere (all LLM/NLP inference is local, free Hugging Face models).

## Known limitations of this setup (read before deploying)

- **RAM**: Render's free web service gives 512MB RAM. The smallest local LLM this app
  uses (`flan-t5-base`) needs ~1GB to load. In practice this means on the free tier the
  LLM will likely fail to load and every AI feature (Copilot chat, insights, reports,
  agents) will silently fall back to the built-in rule-based/template responses instead
  of real model output — the app still works, but "AI-generated" text will be templated.
  If you want real model output, upgrade the Render service to at least the Starter plan
  (2GB RAM, ~$7/mo) later — no code changes needed, same render.yaml.
- **Cold starts**: Render free web services spin down after 15 minutes of inactivity.
  The first request after idling can take 30-60+ seconds (plus model load time if it fits
  in RAM at all).
- **Free Postgres expires**: Render's free Postgres databases are deleted after 90 days.
  You'll need to recreate it and the app will reseed itself on next boot (admin/manager
  accounts and employee CSV data), but any data created since then (retrained models,
  uploaded RAG documents) is lost.
- **Ephemeral disk**: Render's free tier has no persistent disk. The ChromaDB vector
  store and any retrained model files reset on every deploy/restart. Default HR policy
  text is auto-reseeded on startup, but anything you upload via the Documents page will
  not survive a redeploy.
- **Build size**: `requirements.txt` includes torch, transformers, prophet, chromadb,
  sentence-transformers — a genuinely heavy install. If the Render build fails on disk
  space or times out, that's why; see "If the build fails" below.

None of this blocks getting it live — it just means "free" here trades off reliability
and AI-response quality, matching the tradeoff you chose earlier.

## ⚠️ If you already deployed before the multi-tenant update

The database schema changed (new `companies` table, new required `company_id` columns
on `employees` and `model_versions`, seeded demo accounts removed in favor of a
super-admin bootstrap). SQLAlchemy's `create_all()` only creates *missing* tables — it
will not add the new columns to tables that already exist on your live Render Postgres
instance. If you deploy this update on top of the old database as-is, the app will throw
DB errors the first time it touches `employees` or `model_versions`.

Since there's no real customer data yet (just the old seeded demo admin/employees), the
simplest fix is to reset the database rather than write a migration:

1. In Render, open your `workforceiq-db` Postgres instance → **Shell** (or connect with
   `psql` using the External Connection String shown there).
2. Run: `DROP TABLE IF EXISTS predictions, model_versions, employees, users, companies CASCADE;`
3. Redeploy the backend service (or just restart it) — `init_db()` will recreate every
   table with the new schema and bootstrap your `super_admin` account fresh.

## One-time prerequisites

- A GitHub repo with this code pushed (see note below — this session left that step to you).
- A [Render](https://render.com) account, connected to your GitHub.
- A [Vercel](https://vercel.com) account, connected to your GitHub.

## Step 1 — Push to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## Step 2 — Deploy the backend on Render

1. In the Render dashboard: **New > Blueprint**, point it at your GitHub repo. Render
   will read [render.yaml](render.yaml) at the repo root and provision:
   - a free Postgres database (`workforceiq-db`)
   - a free web service (`workforceiq-backend`) running
     `uvicorn main:app --host 0.0.0.0 --port $PORT` from the `backend/` directory
2. Render will ask you to fill in the env vars marked `sync: false` in render.yaml:
   - `CORS_ORIGINS` — leave a placeholder for now (e.g. `http://localhost:5173`), you'll
     update it in Step 4 once you have the Vercel URL.
   - `BOOTSTRAP_SUPERADMIN_EMAIL`, `BOOTSTRAP_SUPERADMIN_PASSWORD` — this is **your own**
     platform-owner login (not a company account). It only takes effect once, while the
     users table is empty, so pick real values now.
   - `SECRET_KEY` and `DATABASE_URL` are generated/wired automatically by the blueprint.
3. Deploy. Once live, note the backend URL Render gives you, e.g.
   `https://workforceiq-backend.onrender.com`.
4. Sanity check: `curl https://workforceiq-backend.onrender.com/health` should return
   `{"status":"healthy","version":"2.0.0"}`.

### If the build fails (disk/RAM/timeout)

The full ML/NLP stack is heavy for a free build environment. If it fails, the fastest
fix is trimming `requirements.txt` to only what you actually need running (e.g. drop
`prophet` if you're fine with the ARIMA-fallback forecast, which is what runs anyway
unless Prophet successfully imports) — ask me and I can do this trim safely if you hit
this.

## Step 3 — Deploy the frontend on Vercel

1. In Vercel: **Add New > Project**, import the same GitHub repo, set **Root Directory**
   to `frontend`.
2. Vercel auto-detects Vite; build command `npm run build`, output `dist` (also pinned
   in [frontend/vercel.json](frontend/vercel.json), which additionally adds the SPA
   rewrite React Router needs — without it, refreshing any non-home route 404s).
3. Add one environment variable in the Vercel project settings:
   - `VITE_API_BASE_URL` = the Render backend URL from Step 2, **no trailing slash**
     (e.g. `https://workforceiq-backend.onrender.com`)
4. Deploy. Note the resulting Vercel URL, e.g. `https://your-app.vercel.app`.

## Step 4 — Close the loop: update backend CORS

Go back to the Render service's environment variables and set:

```
CORS_ORIGINS=https://your-app.vercel.app
```

(comma-separate multiple origins if needed, e.g. also `http://localhost:5173` for local
testing against the prod backend). Save — Render will redeploy the service automatically.

## Step 5 — Verify end to end

1. Open the Vercel URL, log in with your `BOOTSTRAP_SUPERADMIN_EMAIL` / `_PASSWORD`.
2. You should land on the **Companies** page (this account manages tenants — it doesn't
   see any HR data itself). Create a company: fill in a company name plus that company's
   first admin's name/email/password.
3. Log out, log back in as that new company admin — you should now see the full
   dashboard, scoped to that company only.
4. Check the browser's Network tab: requests should go to
   `https://workforceiq-backend.onrender.com/api/...` and return 200, and the
   `wiq_token` cookie should be set (this only works because `ENV=production` makes the
   backend issue the cookie as `Secure; SameSite=None`, required for the cross-domain
   Vercel ↔ Render setup — see [backend/api/auth.py](backend/api/auth.py)).
5. Try the Copilot, Sentiment, Forecast, Reports, and Agents pages — all should return
   real (if terse, given `flan-t5-base`) responses rather than the offline fallback text.

## Multi-company data isolation

Every company's employees, uploaded RAG documents, and retrained attrition models are
isolated from every other company's — enforced server-side by `company_id`, not just
hidden in the UI. If you provision a second company to test this, its admin should see
zero employees and zero documents until they upload their own.

## Rotating credentials later

If you ever suspect the dev `.env` values leaked (they shouldn't have — `.env` is
gitignored), rotate `BOOTSTRAP_SUPERADMIN_PASSWORD` and each company admin's password in
their own account settings. Rotating `SECRET_KEY` invalidates every existing login
session platform-wide.
