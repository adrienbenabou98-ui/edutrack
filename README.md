# EduTrack

A full-stack academic tracking platform for teachers and students. Teachers manage classrooms, assign work, track understanding lesson by lesson, and get AI-powered insights. Students submit work and receive instant feedback.

Available as a web app, a Chromebook PWA, and a Windows desktop app.

---

## Access EduTrack

### Web / Chromebook
Visit **https://edutrack-production-2a6d.up.railway.app** in any browser.

On Chromebook, install it as an app: open the URL in Chrome, then click the install icon in the address bar (or Chrome menu → Install EduTrack). It will appear in your launcher like a native app.

### Windows Desktop
**[EduTrack v1.5.0 — Windows Installer](https://github.com/adrienbenabou98-ui/edutrack/releases/tag/v1.5.0)**

| File | Description |
|---|---|
| `EduTrack Setup 1.5.0.exe` | Installer — recommended for most users |
| `EduTrack-Windows-v1.5.0.zip` | Portable — extract and run `EduTrack.exe` |

All versions connect to the same live server. Create an account on first use or sign in with existing credentials.

---

## Features

### Teacher
- Create classrooms with class codes and optional passwords
- Build assignments, quizzes, and exams with multiple question types (multiple choice, true/false, short answer, long answer)
- Auto-grading for objective questions
- AI-generated feedback on student submissions (powered by Claude)
- Grade Tracker — per-student breakdown by subject and unit, with grade curving
- Lesson understanding tracker — record per-student understanding each lesson using fully customisable levels (drag to reorder, colour picker, absent toggle)
- Analytics dashboard with charts
- Term management and grade boundaries (customisable tiers)
- Teacher notes per student (strengths, areas for improvement)
- PDF export of class progress reports
- CSV export of grades
- In-app messaging

### Student
- Dashboard showing enrolled classrooms and upcoming assignments
- Submit assignments and receive auto-graded results
- View AI feedback on submissions
- Progress view across subjects

### Desktop
- Electron wrapper for a native desktop experience on Windows, Mac, and Linux

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router |
| Backend | Node.js, Express 5, Prisma 5, PostgreSQL |
| Database | Neon (serverless Postgres) |
| AI | Anthropic Claude API |
| Charts | Recharts |
| Desktop | Electron |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (or any PostgreSQL instance)
- An [Anthropic](https://console.anthropic.com) API key

### 1. Clone and install

```bash
git clone https://github.com/adrienbenabou98-ui/edutrack.git
cd edutrack
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="sk-ant-..."
PORT=4000
```

### 3. Set up the database

```bash
npx prisma db push --schema=server/prisma/schema.prisma
```

Optionally seed demo data:

```bash
npm run seed
```

### 4. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

---

## Demo Accounts

After running `npm run seed`, the following accounts are available (all use password `demo1234`):

| Role | Email |
|---|---|
| Teacher | teacher@edutrack.demo |
| Student | alice@edutrack.demo |
| Student | bob@edutrack.demo |
| Student | charlie@edutrack.demo |

Demo class codes: `BIO101` (Year 10 Biology), `MATH01` (Maths)

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend together |
| `npm run server` | Backend only (port 4000) |
| `npm run dev:client` | Frontend only (port 5173) |
| `npm run seed` | Seed demo data |
| `npm run build` | Production build |
| `npm run electron:dev` | Run as desktop app (dev mode) |
| `npm run electron:build` | Build desktop installer |
| `npx prisma db push --schema=server/prisma/schema.prisma` | Sync database schema |
| `npx prisma studio --schema=server/prisma/schema.prisma` | Open Prisma Studio |

---

## Project Structure

```
edutrack/
├── src/                   # React frontend
│   ├── pages/             # Teacher and student pages
│   ├── components/        # Shared UI components
│   ├── store/             # Zustand state stores
│   └── api/               # Axios client
├── server/                # Express backend
│   ├── controllers/       # Route handlers
│   ├── routes/            # API routes
│   ├── services/          # Business logic + AI
│   ├── middleware/        # Auth middleware
│   └── prisma/            # Schema, migrations, seed
└── electron/              # Desktop app wrapper
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `ANTHROPIC_API_KEY` | Claude API key for AI feedback |
| `PORT` | Backend port (default: 4000) |
