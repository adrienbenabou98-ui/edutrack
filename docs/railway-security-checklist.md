# Railway Security Checklist

Manual steps to verify in the Railway dashboard before and after every production deployment.

---

## Staging Environment

Log in to [Railway](https://railway.app) → select the staging service.

### Variables tab
- [ ] `DATABASE_URL` points to the **staging** database, not production
- [ ] `NODE_ENV` is set to `staging` (not `production`, not `development`)
- [ ] `DEBUG` is `false`
- [ ] `ANTHROPIC_API_KEY` is a test/staging key, not the live production key
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are from the staging OAuth app
- [ ] `CORS_ORIGIN` is set to the staging frontend domain only

---

## Production Environment

Log in to [Railway](https://railway.app) → select the production service.

### Variables tab
- [ ] `NODE_ENV` = `production`
- [ ] `DEBUG` = `false`
- [ ] `DATABASE_URL` uses the production Neon database URL
- [ ] `CORS_ORIGIN` is set to `https://edutrack-production-2a6d.up.railway.app` (no trailing slash, no wildcard)
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are long random strings (≥64 hex chars), not placeholder values
- [ ] `ANTHROPIC_API_KEY` is the live production key
- [ ] `FRONTEND_URL` = `https://edutrack-production-2a6d.up.railway.app`
- [ ] `GOOGLE_REDIRECT_URI` = `https://edutrack-production-2a6d.up.railway.app/api/google/callback`

### Build logs
- [ ] No environment variable **values** are printed during the build (only variable names are acceptable)
- [ ] No `console.log` statements output secrets or full connection strings

### Networking tab (Database service)
- [ ] **Public Networking** is **disabled** on the Neon/database service
  - The app connects via Railway's private network (`${{Postgres.DATABASE_URL}}`)
  - Public access is only needed temporarily for local `prisma db push` — disable after use

---

## Health Check Configuration

1. In Railway → Production service → **Settings** tab
2. Set **Health Check Path** to `/health`
3. Railway will GET `/health` after each deploy — a non-200 response rolls back automatically

The `/health` endpoint returns:
```json
{ "status": "ok", "timestamp": "...", "environment": "production" }
```

It intentionally exposes **no** database credentials, internal paths, dependency versions, or system info.

---

## General Railway Checks

- [ ] No secrets appear in **build commands** or **Dockerfile** — all secrets come from Railway environment variables
- [ ] The Railway project has **2FA enabled** on the owner account
- [ ] Only team members who need deploy access are listed under **Members**
- [ ] Review **Deploy logs** after each deploy to confirm the startup message:
  ```
  Production environment validated ✓
  Server running on http://localhost:4000
  ```
  If you see `Missing required production env vars:` the server exited — check which vars are missing.

---

## Post-deploy Smoke Test

```bash
# Health check
curl https://edutrack-production-2a6d.up.railway.app/health

# CORS rejection (should return 403/error, not 200)
curl -H "Origin: https://evil.com" https://edutrack-production-2a6d.up.railway.app/api/auth/login

# Rate limit (run 11 times fast — 11th should return 429)
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://edutrack-production-2a6d.up.railway.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}'
done
```
