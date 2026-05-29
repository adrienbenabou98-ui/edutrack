# EduTrack — CLAUDE.md

Full-stack academic tracking platform (web + Chromebook PWA + Windows Electron desktop).

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4 + Zustand + React Router
- **Backend:** Node.js + Express 5 + Prisma v5 + PostgreSQL (Neon cloud)
- **Desktop:** Electron wrapper (electron-builder)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Auth:** JWT (access 15 min) + refresh token (30 d), RBAC: TEACHER / STUDENT / ADMIN

## Key Commands

Run from `C:\Users\adrie\edutrack`:

```bash
npm run dev                   # frontend (5173) + backend (4000) together
npm run server                # backend only
npm run dev:client            # frontend only
npx prisma db push --schema=server/prisma/schema.prisma   # sync DB (stop server first)
npx prisma generate --schema=server/prisma/schema.prisma  # regen Prisma client
npm run seed                  # reset DB to demo data — WIPES everything
npx tsx scripts/create-admin.ts [email] [password] [name] # add admin without wiping
npx tsx scripts/backup-db.ts  # export DB snapshot to backups/
npm run electron:build:prod   # build Windows installer pointing to live Railway URL
```

## Deployments

| Target | URL |
|---|---|
| Live web app | https://edutrack-production-2a6d.up.railway.app |
| GitHub repo | https://github.com/Sir-Adrien-Claudington/edutrack (private) |

Railway auto-deploys on every push to `master` (1–2 min lag).

## Gotchas

- Stop server before `prisma generate` — Windows locks the DLL
- Always use `npm run electron:build:prod` for installer (bakes in Railway URL)
- `release/` and `electron/dist-electron/` are gitignored — don't commit binaries
- Tailwind v4 dark mode uses `@variant dark` in CSS, NOT `darkMode: 'class'` in config
- Auth login response field is `access` not `accessToken`
- TypeScript unused vars cause Railway build failure — tsc exits non-zero

---

## Security

### Overview

This project follows a layered security model across GitHub, Railway deployment, and the application itself.

### GitHub Security

- **CodeQL** scanning runs on every push/PR and weekly (`.github/workflows/codeql.yml`)
- **Dependency vulnerability review** runs on every PR — fails on HIGH/CRITICAL (`.github/workflows/dependency-review.yml`)
- **Secret scanning** via TruffleHog runs on every push (`.github/workflows/secret-scan.yml`)
- **Branch protection** is enforced on `master` — no direct pushes, PRs require passing checks
- Run `scripts/setup-github-branch-protection.sh` once after repo creation to apply branch rules via GitHub CLI

### Railway Security

- See `docs/railway-security-checklist.md` for manual verification steps in the Railway dashboard
- Staging and production use separate environment variable sets
- Health check endpoint: `GET /health` — configure in Railway → Settings → Health Check Path
- Required production env vars are validated at startup — server exits if any are missing

### App Security

- **Rate limiting:** login (10/min), register (5/hr), API (500/15 min) — `server/middleware/rateLimiter.ts`
- **CORS** locked to `CORS_ORIGIN` environment variable (comma-separated origins)
- **Input validation** via Zod on auth and assignment routes — `server/middleware/validate.ts`, `server/schemas/`
- **Security headers** via Helmet (`server/index.ts`)
- **Prompt injection guard** on all Claude API routes — `server/middleware/promptGuard.ts`
- **bcrypt** password hashing (cost 12)
- **JWT** access (15 min) + refresh (7 d), both carry `tokenVersion` for force-logout
- **IDOR** fixes on classroom, student analytics, and export routes (verified v1.9.0)
- **1 MB** body size limit with JSON error on 413

### Security Checklist (run before every production deployment)

- [ ] No `.env` files committed: `git status`
- [ ] All GitHub Actions passing on `master`
- [ ] `CORS_ORIGIN` set to production domain in Railway
- [ ] `NODE_ENV=production` in Railway production service
- [ ] `DEBUG=false` in Railway production service
- [ ] Database public networking disabled in Railway
- [ ] Dependabot alerts reviewed and resolved
- [ ] Rate limiting confirmed active: `curl -X POST /api/auth/login` × 11 → 429 on 11th

### Reporting Security Issues

Do not open a public GitHub issue for security vulnerabilities. Contact the project owner directly.
