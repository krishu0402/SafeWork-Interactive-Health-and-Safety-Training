# SafeWork Week 7 initial prototype (A7)

Client system for the logistics and warehousing (automotive) client.  
Built by **SafeTech Solutions (Team 1)** for **CET257 Assignment 1, Task A7**.

This is an **unfinished front-end prototype**. It is **not** the SafeTech marketing website (A6) and **not** the Assignment 2 (B6) system.

## How to run

1. Unzip the folder if needed.
2. Open `index.html` in **Google Chrome** or **Microsoft Edge** (double-click, or drag the file into the browser).
3. No install, server, or login credentials are required. Any password on the forms is accepted.

## Demonstration path (20-minute client session)

1. Start on **Choose portal** (`index.html`) — two CEMS-style entry screens.
2. **Worker portal** → Sign in → Dashboard → Training modules → Manual Handling scenario → choose an answer → feedback → My progress.
3. Return to portal choice → **Admin / supervisor portal** → pick Supervisor or Administrator → Team overview, Workforce, Content placeholders.

Suggested live answers: worker question **B** (correct), then show an incorrect option if time allows.

## What this build shows (Must MVP)

| ID | Requirement | Week 7 treatment |
|---|---|---|
| FR01 | Login / roles | Separate worker and admin entry screens; simulated only |
| FR02 | Profile / records | Sample user “Alex Kumar” |
| FR03 | Module selection | Manual Handling live; Forklift, PPE, Fire = Preview |
| FR04–FR05 | Interactive scenario | One warehouse scene |
| FR06–FR07 | Assessment + feedback | One question, immediate explanation |
| FR08 | Progress | Static table; refresh clears the demo |
| FR13 | Browser use | Desktop Chrome/Edge |

Admin screens show the **shape** of FR09 (reports) and FR11 (content tools) with dummy data.

## Intentionally not built (for client Q&A → B6)

- Real registration, passwords, sessions, database
- Locked portals (workers cannot technically be blocked from opening `admin.html`)
- Saved progress between visits
- Certificates (FR10)
- Email/SMS reminders (FR12)
- Full Forklift / PPE / Fire / Emergency modules
- Working CMS
- 360° / VR (FR14)
- Encrypted auth, backups, uptime (report in B4 later)

## Files

- `index.html` — two-portal entry
- `worker.html` — trainee journey
- `admin.html` — supervisor / administrator mock portal
- `css/styles.css`, `js/app.js`
- `A7-SPEAKER-NOTES.md` — Krishu demo script and full session plan

Prototype UI: Krishu Kandel (Developer and UI Support).
