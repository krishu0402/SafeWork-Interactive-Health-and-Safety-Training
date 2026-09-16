# A7 speaker notes and demonstration plan

**Module:** CET257 Enterprise Project  
**Team:** Team 1 — SafeTech Solutions  
**Product:** SafeWork (client training system)  
**Session:** Presentation of initial solution ideas / prototype to client (max 20 minutes including questions)  
**Prototype file:** open `index.html`

These notes support the **client prototype**, not the SafeTech promotional website (that is A6).

---

## Individual responsibility chart (A7)

| Person | Role | A7 responsibility |
|---|---|---|
| Pallawi Tamang Dong | Project Manager / Technical Lead | Open, close, timings, requirements summary, Q&A control |
| Anushka GC | Deputy PM / Documentation | A1 evidence, outstanding clarifications OC01–OC07 |
| Rashu Lama | Communication Lead / Analyst | Client need, warehouse context, success criteria |
| **Krishu Kandel** | **Developer and UI Support** | **Live prototype demo (both portals)** |
| Ayusha Rayamajhi | Presentation & ePortfolio | Slides, visual flow, screen sharing backup |
| Laxmi Tamang | Research & Quality Analyst | What is in / out of Week 7 vs B6 |

If a laptop fails: Ayusha shares screenshots; Krishu talks through the same click path.

---

## Suggested 20-minute timing

| Minutes | Who | What |
|---|---|---|
| 0–2 | Pallawi | Team intro, SafeTech vs SafeWork, “this is an unfinished prototype” |
| 2–5 | Rashu | Client problem: short, practical warehouse training, not paperwork |
| 5–8 | Anushka | Must MVP (FR01–FR08, FR13). Should items later. OC02 supervisor role. |
| **8–15** | **Krishu** | **Demo (script below)** |
| 15–17 | Laxmi | What we will build after your feedback (two locked portals, certificates, more modules) |
| 17–20 | Whole team | Client questions |

Keep the demo inside 7 minutes so the client can talk.

---

## Krishu — live demo script

Speak slowly. On screen, **never** say FR codes, A7, or “prototype”. Talk as if this is their warehouse system. Keep requirement IDs for the team only.

### 1. Portal choice (`index.html`) — 45 seconds

> “This is **SafeWork**, the training platform for your warehouse.  
> Workers complete courses on one side. Supervisors and administrators manage the site on the other — the same idea as a student portal and a staff portal.  
> We have started with the worker journey and a staff overview. Remaining modules and certificates can follow your priorities.”

Click **Sign in as a worker**.

### 2. Worker login — 30 seconds

> “Each worker signs in with their work email so they only see their own training.  
> For this walkthrough we are using Alex Kumar in inbound.”

Click **Sign in**. Stay on **Alex Kumar**.

### 3. Dashboard — 45 seconds

Point at the four tiles, then Continue training.

> “The worker lands on a simple dashboard: what is due, overall progress, one module to continue.  
> These numbers are sample data so you can see the layout.  
> We kept text short for mixed digital literacy on the warehouse floor.”

Click **Continue**.

### 4. Modules — 40 seconds

> “Manual Handling is the live path, matching the priority from our August meetings.  
> Forklift, PPE and Fire are listed but Preview-only.  
> We did not fake a finished catalogue. You can tell us the order of the remaining modules.”

Click **Coming soon** once so the toast appears, then **Open** on Manual Handling (or go to Scenarios).

### 5. Scenario + feedback — 2 minutes (core of the demo)

> “This is the Must training loop: see a warehouse situation, make a safety decision, get feedback immediately — which you asked for in the second client meeting.”

First click **B** (correct). Read the green explanation.

If time: refresh is not needed; click **A** on a second pass only if you re-open the page later. Do **not** confuse the room with too many clicks.

> “The pass mark, exact duration and full hazard list are still open (our clarification OC03). Please tell us what ‘pass’ means for your sites.”

Click **See my progress**.

### 6. Progress — 30 seconds

> “Workers can see module status. This table does **not** save.  
> Certificates and reminders are not here. We can add them after you confirm they are required.”

Click **Certificates** in the side menu so the coming-soon toast shows.

### 7. Switch portal — 20 seconds

Click **Switch workspace** (or the SafeWork logo). Then **Sign in as staff**.

> “Workers should not manage other people. Today they still *could* open this file — that lock is B6. We are showing you the second door so you can say how staff should work.”

Sign in as **Supervisor** first.

### 8. Admin overview and workforce — 1 minute

> “This is the shape of a CEMS staff view: team completion, overdue people, dummy names.  
> Supervisors would mainly **watch**. Administrators would **edit content**.”

Open **People**, point at Add worker (toast). Then sign-out is optional; instead open **Content**.

If you logged in as Supervisor, mention:

> “If you want supervisors blocked from Edit module, say so today. That is OC02 in our A1 document.”

You can **Sign out**, choose **Administrator**, and open Content once.

### 9. Hand back to the team — 15 seconds

> “That is the Week 7 prototype: a working click-through of the worker journey, and a mock management portal.  
> Please tell us after the demo: two locked portals, pass mark, extra modules, certificates, and who is allowed to edit training.”

Stop sharing extra clicks. Let Pallawi open questions.

---

## Lines for the whole team — “not done on purpose”

Use these if the client asks “why doesn’t it…?”

| If they ask | Answer |
|---|---|
| Why can I open both portals? | Week 7 shows two doors. Real lock-out needs accounts. We will do that in B6 if you confirm CEMS-style access. |
| Why no certificate? | FR10 is a Should item. A1 said it is not required for the first prototype. |
| Why only one quiz? | Must MVP is Manual Handling. Other modules wait for your order and pass rules. |
| Why no VR / 360°? | FR14 is Could / later. We will not claim it as finished. |
| Will progress save? | Not yet. Saving mid-shift is a reliability requirement we want you to confirm. |
| Is this the company website? | No. SafeTech.com-style site is A6 marketing. This folder is the **client** system. |

---

## Questions we want the client to answer (write these on a slide)

1. Confirm **two locked portals**: workers never see admin screens?  
2. Is **Supervisor** separate from **Administrator** (view only vs edit content)?  
3. Pass mark, time limit, and hazards for Manual Handling?  
4. Next modules after Manual Handling: Forklift, PPE, Fire, Emergency — which first?  
5. Do you need **certificates** and **overdue reminders** in the next prototype?  
6. Rough **headcount** (for later scalability)?  
7. Any accessibility standard we must meet?

---

## Krishu backup if the live file fails

Talk the same path while Ayusha shows:

1. Two portal cards  
2. Worker dashboard  
3. Warehouse scene with option B  
4. Green feedback  
5. Admin team table and grey “Edit” buttons  

Say: “The interaction is HTML in the browser. B6 will add storage and security after this feedback.”
