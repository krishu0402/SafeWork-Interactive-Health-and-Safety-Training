# SafeWork — Interactive Health & Safety Training (Prototype)

**SafeTech Solutions · Team 1 · CET257 Enterprise Project — Assignment 1, Task A7**
**Client:** Logistics & Warehousing Co. (Automotive Sector) · **Tutor:** Dr Becky Allen

## Overview

SafeWork is a browser-based health and safety training platform being developed for a
warehousing and logistics client. Workers complete interactive training modules —
spotting hazards, answering scenario-based questions, and earning certificates — while
supervisors and administrators track team progress.

This repository contains the **Week 7 client demonstration prototype**: a static,
front-end-only build used to show the client working screens and gather feedback ahead
of Assignment 2 (B6). It is not a production system and is not connected to a database
or server — see [Scope and limitations](#scope-and-limitations) below.

> Looking for the promotional/marketing website instead? That lives in a separate
> repository (`safetech-website`) and is not part of this prototype.

## Running the prototype

No installation, build step, or server is required.

1. Download or clone this repository.
2. Open `index.html` in Google Chrome or Microsoft Edge (double-click, or drag the file
   into the browser).
3. Choose **Worker** or **Admin/Supervisor** to sign in.

Progress is stored in your browser's `localStorage`, so it persists across reloads on the same device but is not shared between devices or users.

## Suggested demo path

1. **Worker portal** → sign in → Dashboard → *My training* → open **Manual Handling** →
   find both hazards in the scene → answer both questions → view the result → download
   the certificate if passed → *My progress* (now reflects the completed module).
2. Repeat briefly for **Hazard Awareness** to show a second complete module.
3. **Supervisor portal** → sign in → *Team overview* → *People* → add, edit or delete a worker and assign a module.
4. **Administrator portal** → sign in → review the overview and training-content area; workforce management is restricted to the Supervisor role in this prototype.

## What is functionally built vs. simulated

This prototype deliberately implements roughly half of the requirements documented in
Assignment 1, and marks the rest clearly as "coming soon" rather than faking them. That
split is an intentional A7-stage scope decision, not an oversight — see
[Scope and limitations](#scope-and-limitations).

| Requirement (A1 reference) | Status | Notes |
|---|---|---|
| FR01 User authentication | Built | Client-side format validation only; no real accounts |
| FR02 User profile management | Built | Single demo profile, persisted locally |
| FR03 Training module selection | Partially built | Manual Handling and Hazard Awareness are complete; PPE and Fire Safety are scheduled |
| FR04 Interactive object engagement | Built | Clickable hazard hotspots with immediate feedback |
| FR05 Safety scenario simulation | Built | One hazard-spotting scene per built module |
| FR06 Knowledge assessment | Built | Two scored questions per built module |
| FR07 Real-time feedback | Built | Immediate correct/incorrect feedback with explanation |
| FR08 Progress tracking | Built | Computed live from stored state; persists across reloads |
| FR09 Reporting dashboard | Partially built | Admin views read the worker portal's real, live progress; wider organisation figures are illustrative sample data |
| FR10 Certificate generation | Built (lightweight) | Canvas-generated, downloadable PNG on passing a module |
| FR11 Content management | Not built | Scheduled for Assignment 2 (B6) |
| FR12 Notifications and reminders | Not built | Scheduled for Assignment 2 (B6) |
| FR13 Cross-platform support | Built | Responsive layout across desktop and mobile breakpoints |
| FR14 Future VR integration | Not built | Documented in A1 as a future extensibility target only |

The assessment pass mark (70%) is labelled in the interface as **provisional, pending
client confirmation** (A1, Outstanding Clarification OC03).

## Scope and limitations

Built deliberately for this A7 stage:

- Two complete training modules (Manual Handling, Hazard Awareness), each with a
  hazard-spotting scene, a two-question assessment, real-time feedback, and a
  downloadable certificate on passing.
- Live progress tracking and a dashboard computed from real state, not static numbers.
- A working link between the worker and admin portals: completing training as a worker
  updates what an administrator sees.

Not built, by design, pending client feedback and Assignment 2:

- Real user registration, authentication, sessions, or a server-side database.
- Access control — a worker can technically open the admin portal directly by URL.
- PPE and Fire Safety module content.
- A working content-management system for administrators.
- Email or SMS reminders.
- 360°/VR training delivery.
- Encrypted authentication, backups, and uptime guarantees (covered separately in the
  Assignment 2 security report, B4).

## Project structure

```
index.html      Portal chooser (worker vs. admin/supervisor)
worker.html     Worker sign-in, dashboard, training, module flow, progress
admin.html      Admin/supervisor sign-in, team overview, people, content
css/styles.css  Shared design system and layout
js/app.js       Application logic: auth, state, module engine, certificates
```

State is held in a single `localStorage` key (`safework_demo_v1`); a **Log out** control
control is available in both portals to clear it.

## Team

**SafeTech Solutions — Team 1**

| Name | Role |
|---|---|
| Pallawi Tamang Dong | Project Manager / Technical Lead |
| Anushka GC | Deputy Project Manager / Documentation Manager |
| Rashu Lama | Communication Lead / Analyst |
| Krishu Kandel | Developer and UI Support |
| Ayusha Rayamahji | Presentation & ePortfolio Coordinator |
| Laxmi Tamang | Research & Quality Analyst |

Prototype UI and logic (this repository): Krishu Kandel, Developer and UI Support.