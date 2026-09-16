# WorkforceIQ v3.0 — Setup Guide
# New features: Multi-tenant auth, per-company data isolation, PostgreSQL, Model Retraining

## Step 1 — Create the PostgreSQL database

Open pgAdmin or run in terminal:

```sql
CREATE DATABASE workforceiq;
```

Or via terminal:
```bash
psql -U postgres -c "CREATE DATABASE workforceiq;"
```

## Step 2 — Configure environment variables

Copy `.env.example` to `.env` in the root folder and fill in real values (database password, a generated `SECRET_KEY`, and your own bootstrap super-admin credentials):

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_hex(32))"   # paste into SECRET_KEY
```

All variables in `.env.example` are required — the app will fail to start if any are missing.

## Step 3 — Install new Python packages

```bash
pip install python-jose[cryptography] passlib[bcrypt] alembic psycopg2-binary
```

## Step 4 — Generate the synthetic data (optional — for local experimentation only)

```bash
python datasets/synthetic_hr_data.py
```

This is not loaded automatically — there is no seed data. Each company uploads its own employee CSV via the Model Retraining page after being provisioned (Step 7).

## Step 5 — Start the backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

On first startup, if the users table is completely empty, it creates exactly one account: your own `super_admin` (platform owner) login, using `BOOTSTRAP_SUPERADMIN_EMAIL` / `BOOTSTRAP_SUPERADMIN_PASSWORD` from `.env`. Nothing else is seeded.

## Step 6 — Start the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

## Step 7 — Log in and provision your first company

1. Go to http://localhost:5173 and log in with your `BOOTSTRAP_SUPERADMIN_EMAIL` / `BOOTSTRAP_SUPERADMIN_PASSWORD`.
2. You'll land on the **Companies** page (the only thing the platform-owner account can see — it isn't tied to any one company's data).
3. Fill in **Create New Company**: company name + the first admin's name/email/password for that company.
4. Log out, log back in as that new admin — you'll now see the full HR platform, scoped only to that company.
5. Repeat step 3 for each additional company. Every company's employees, uploaded documents, and retrained models are fully isolated from every other company's.

There is no public signup form — only the platform owner (super_admin) can create new companies, via `POST /api/auth/companies`.

---

## Role-Based Access Summary

| Feature | super_admin (you) | Company admin | Company manager |
|---|---|---|---|
| Provision new companies | ✅ Yes | ❌ No | ❌ No |
| Dashboard / employees | — (not tied to a company) | All departments, own company only | Their department only, own company only |
| Attrition predictions | — | All employees (own company) | Their dept employees only |
| Sentiment analysis | — | Own company only | Own dept only |
| Reports | — | Own company only | Own dept only |
| Model Retraining | — | ✅ Yes (own company's model) | ❌ No |
| User Management (invite teammates) | — | ✅ Yes (own company only) | ❌ No |
| Forecasting | — | Own company | Own dept |

---

## Model Retraining (company admin only)

1. Log in as a company admin
2. Click "Model Retraining" in the sidebar
3. Upload a CSV of your company's employees (or use the ones already uploaded)
4. Click "Start Retraining"
5. Watch live progress — a new model version is trained **only on your company's data** and saved under that company's own model directory, so it never affects any other company's predictions
