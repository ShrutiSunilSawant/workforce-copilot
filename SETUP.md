# WorkforceIQ v2.0 — Setup Guide
# New features: Login, Role-Based Access, PostgreSQL, Model Retraining

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

Copy `.env.example` to `.env` in the root folder and fill in real values (database password, a generated `SECRET_KEY`, and your own seed admin/manager passwords):

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_hex(32))"   # paste into SECRET_KEY
```

All variables in `.env.example` are required — the app will fail to start if any are missing.

## Step 3 — Install new Python packages

```bash
pip install python-jose[cryptography] passlib[bcrypt] alembic psycopg2-binary
```

## Step 4 — Generate the synthetic data

```bash
python datasets/synthetic_hr_data.py
```

## Step 5 — Start the backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

On first startup it will:
- Create all database tables automatically
- Seed default admin and manager accounts
- Load employee data from CSV into PostgreSQL

## Step 6 — Start the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

## Step 7 — Open the app

Go to: http://localhost:5173

You will see the login page.

---

## Default Login Accounts

Seeded on first startup using the credentials you set in `.env`:

### Admin Account (sees ALL departments)
- Email: `SEED_ADMIN_EMAIL`
- Password: `SEED_ADMIN_PASSWORD`

### Manager Accounts (sees ONLY their department), all using `SEED_MANAGER_PASSWORD`
- eng.manager@workforceiq.com → Engineering only
- sales.manager@workforceiq.com → Sales only
- hr.manager@workforceiq.com → HR only
- finance.manager@workforceiq.com → Finance only

---

## Role-Based Access Summary

| Feature | Admin | Manager |
|---|---|---|
| Dashboard | All departments | Their department only |
| Attrition predictions | All employees | Their dept employees only |
| Sentiment analysis | All departments | Their dept only |
| Reports | Full company | Their dept only |
| Model Retraining | ✅ Yes | ❌ No |
| User Management | ✅ Yes | ❌ No |
| Forecasting | All | Their dept |

---

## Model Retraining (Admin only)

1. Login as admin
2. Click "Model Retraining" in the sidebar
3. Click "Start Retraining"
4. Watch live progress
5. New model version saved to database
