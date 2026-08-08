# Pulse Feedback — Monthly Performance Evaluation (Take-home)

Multi-tenant app where managers give monthly feedback across five fixed parameters, employees track their scores over time, and HR sees who still hasn’t submitted.

**Stack:** React (Vite) · Node.js / Express · PostgreSQL (Prisma)

---

## Why PostgreSQL

The product is relational at its core: companies → users → manager hierarchy → monthly cycles → one submission per employee per cycle → five scored parameters. PostgreSQL + foreign keys make those invariants enforceable (and make HR “who’s pending?” queries straightforward). MongoDB would work, but we’d re-implement the same constraints in application code.

---

## Quick start

### Prerequisites
- Node.js 18+
- Docker (for Postgres)

### 1. Start the database

```bash
docker compose up -d
```

Postgres is exposed on **localhost:5433** (to avoid clashing with a local Postgres on 5432).

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npm run db:setup
npm run dev
```

API: `http://localhost:4001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

---

## Demo accounts

Password for **all** users: `password123`

| Persona | Email | What to try |
|--------|--------|-------------|
| Priya (Ashoka manager) | `priya@ashoka.test` | Give feedback to 6 reports; 2 still pending in July |
| Rohan (Ashoka) | `rohan@ashoka.test` | Gives feedback to Priya; receives from COO |
| Meera COO | `meera.coo@ashoka.test` | Gives feedback to Rohan (pending in open cycle) |
| Kavita HR | `kavita.hr@ashoka.test` | Completion board — who hasn’t submitted |
| Aisha (employee) | `aisha@ashoka.test` | Score history per parameter |
| Ananya (Bright Path founder) | `ananya@brightpath.test` | Flat org — feedback to 8 people |
| Leela HR | `hr@brightpath.test` | Completion for flat org |
| Omar (employee) | `omar@brightpath.test` | Score trends |

---

## Data model (what holds the scenarios)

```
Company
  └── User (role: EMPLOYEE | MANAGER | HR)
        └── managerId → User   ← org hierarchy / who reviews whom
  └── FeedbackCycle (company + year + month, OPEN|CLOSED)
        └── FeedbackSubmission (cycle + employee, written by manager)
              └── FeedbackScore × 5 (parameter, score 1–5, comment)

FeedbackParameter — five fixed params shared across pilot companies
```

| Pilot scenario | How the model represents it |
|----------------|-----------------------------|
| Ashoka: Priya → 6 reports; Rohan → Priya; COO → Rohan | `managerId` chain on `User` |
| Bright Path: founder → ~8 people, no middle layer | All 8 have `managerId = founder` |
| Kavita (HR): who hasn’t submitted | Expected set = every user with a manager who has reports; left join submissions for the cycle |
| Employees: scores over months, per parameter | `FeedbackSubmission` + `FeedbackScore` history for `employeeId` |
| One login, many companies | Shared app; tenant = `user.companyId` (email unique per company) |

### Key constraints
- One feedback submission per employee per cycle (`cycleId + employeeId` unique).
- Only the employee’s current manager may create/update that submission.
- Every submission must include all five parameters, each with score **and** written rationale.
- Cycles are per company so pilots can run on independent calendars.

---

## Assumptions

1. **Org hierarchy drives “who gives feedback”** — not a separate assignment table. If A’s `managerId` is B, B is responsible for A’s monthly review.
2. **Roles gate the UI** — `MANAGER` / `EMPLOYEE` use the employee app (give + receive); `HR` uses the HR completion/directory app. Managers are also employees and can view their own history.
3. **Five parameters are global** for the pilot (Ownership, Communication, Quality of Work, Collaboration, Reliability), not customized per company yet.
4. **Scores are 1–5 integers** with a required comment per parameter.
5. **One open cycle at a time is the working assumption** for “give feedback”; HR can inspect any cycle.
6. **HR users are outside the monthly review set** for the pilot — they monitor completion, and are not expected to receive (or appear as pending) performance feedback.
7. **Shared login page** — company is resolved from the authenticated user, not a company picker on login.
8. **Auth is JWT + bcrypt** suitable for a pilot demo, not production SSO.

---

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/feedback/team` | Direct reports + status for open cycle |
| GET | `/api/feedback/parameters` | Five fixed parameters |
| GET | `/api/feedback/my-history` | Own scores + per-parameter trend |
| GET | `/api/feedback/submission/:employeeId` | Load form for a report |
| POST | `/api/feedback/submit` | Create/update feedback |
| GET | `/api/hr/completion` | HR pending/complete board |
| GET | `/api/hr/directory` | Company org directory |
| GET | `/api/hr/cycles` | Cycles for company |

---

## Project layout

```
backend/          Express API + Prisma schema + seed
frontend/         React employee app + HR app
docker-compose.yml
```
