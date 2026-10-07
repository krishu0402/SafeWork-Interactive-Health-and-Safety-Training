# SafeWork – Interactive Health & Safety Training System

SafeWork is an interactive, web-based Health & Safety training platform engineered for logistics and warehousing environments. Developed by **SafeTech Solutions** for the **CET257 Enterprise Project (Assignment 2: Final Group Project)**, the platform replaces passive compliance reading with interactive hazard simulations, server-side assessment validation, automated certificate issuance, and supervisor audit reporting.

---

## Project Overview

In logistics and warehousing facilities, traditional e-learning often suffers from low knowledge retention. SafeWork addresses this by implementing an active discovery learning model:

$$\text{Hover} \longrightarrow \text{Discover} \longrightarrow \text{Investigate} \longrightarrow \text{Answer} \longrightarrow \text{Feedback} \longrightarrow \text{Progress}$$

The application provides a responsive SaaS dashboard combined with realistic warehouse simulation scenarios covering UK Health and Safety Executive (HSE) priority areas.

---

## Main Features

- **Interactive Safety Hotspots:** Five module-specific simulation environments with interactive elements, hover tooltips, and slide-out investigation drawers.
- **Role-Based Access Control (RBAC):** Three distinct user roles (Worker, Supervisor, Administrator) with server-enforced permissions.
- **Server-Side Assessment Engine:** Randomizable multiple-choice quizzes with strict server-side grading ($70\%$ pass mark threshold) and question-by-question explanations.
- **Multi-Attempt & Retest Workflow:** Workers can retake failed assessments or proactively reset and retest completed modules for refresher training.
- **Automated Certification:** Server-generated HTML certificates with unique cryptographic reference codes (`SW-XX-YYYY-ZZZZ`) and print-to-PDF formatting.
- **Supervisor Compliance Suite:** Real-time team compliance metrics, overdue tracking, failed assessment intervention lists, and one-click UTF-8 CSV exports.
- **Administrator Management Suite:** Complete CRUD interfaces for managing workforce accounts, curriculum parameters, and assessment question banks.
- **B2B Promotional Website:** A dedicated corporate marketing website (`/safetech/`) outlining SafeTech Solutions' services, methodology, and ROI case studies.

---

## User Roles

### Worker (Role 1)
- View assigned training courses, deadlines, and current progress.
- Study structured training slides before launching simulations.
- Explore interactive warehouse scenarios and resolve safety hazards.
- Complete timed assessments and receive instant explanatory feedback.
- View and print official certificates of completion.
- Reset and retest completed training modules at will.
- Review historical training records in the personal training ledger.

### Supervisor (Role 2)
- Monitor aggregate team compliance rates and training status breakdowns.
- Assign mandatory safety modules to workers with calendar due dates.
- Track failed assessments in real time to schedule targeted in-person retraining.
- Filter workforce records and export audit-ready compliance CSV reports.

### Administrator (Role 3)
- Manage user accounts, departmental allocations, and shift schedules.
- Activate or deactivate employee portal access.
- Author, edit, and archive training modules and pass mark thresholds.
- Maintain question banks, multiple-choice options, and pedagogical explanations.
- Access global system audit logs and full certificate registries.

---

## Technology Stack

- **Frontend:** Vanilla HTML5, CSS3 Custom Properties (Bespoke SaaS Design System), Vanilla ES6 JavaScript, Chart.js.
- **Backend:** Node.js, Express.js RESTful API.
- **Database:** SQLite3 (11 relational tables, active foreign key constraints).
- **Security:** `bcrypt` (10-round salt password hashing), `express-session` (HTTP-only session cookies), `helmet` (Content Security Policy & HTTP security headers), CORS.
- **Testing:** Automated Headless E2E Simulation (Puppeteer) and API Integration Suite.

---

## Project Structure

```
SafeWork/
├── database/
│   ├── database.sqlite            # Local SQLite database instance
│   └── schema.sql                 # Complete relational DDL schema (11 tables)
├── demo-screenshots/              # High-resolution demonstration evidence captures
├── public/
│   ├── assets/                    # Image assets (warehouse simulation background)
│   ├── css/                       # Modular stylesheets (dashboard, auth, scenarios)
│   ├── js/                        # Client-side controllers (worker, supervisor, admin)
│   ├── safetech/                  # SafeTech Solutions promotional website (Task B2)
│   ├── about.html                 # Platform overview page
│   ├── admin.html                 # Administrator portal
│   ├── contact.html               # Enterprise contact page
│   ├── features.html              # Feature breakdown page
│   ├── how-it-works.html          # Simulation guide page
│   ├── index.html                 # Public home page
│   ├── login.html                 # Secure unified login portal
│   ├── supervisor.html            # Supervisor compliance portal
│   └── worker.html                # Worker training & simulation portal
├── scripts/
│   ├── api-tests.js               # Standalone API integration test runner
│   ├── capture-all-final-screenshots.js # Automated evidence screenshot generator
│   ├── capture-interactive-demo.js# Simulation screenshot generator
│   ├── initDb.js                  # Database initialization and seeder script
│   └── run-all-tests.js           # Master 25-point automated E2E test runner
├── src/
│   ├── config/
│   │   └── database.js            # SQLite database connection & Promise helpers
│   ├── middleware/
│   │   └── auth.js                # requireAuth & requireRole RBAC middleware
│   ├── routes/
│   │   ├── assignmentRoutes.js    # Training assignment, scoring, & certificates
│   │   ├── authRoutes.js          # Authentication & user profile endpoints
│   │   ├── contactRoutes.js       # Contact form submission endpoint
│   │   ├── moduleRoutes.js        # Module management endpoints
│   │   ├── questionRoutes.js      # Question authoring endpoints
│   │   ├── reportRoutes.js        # Compliance reports & failed tracking endpoints
│   │   └── userRoutes.js          # User administration endpoints
│   └── server.js                  # Express server entry point & security configuration
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git exclusion rules
├── package.json                   # Project metadata & npm scripts
├── package-lock.json              # Dependency lockfile
├── README.md                      # Project documentation
└── test-b6.js                     # B6 regression verification suite
```

---

## Prerequisites

- **Node.js:** Version 18.0.0 or higher
- **npm:** Version 9.0.0 or higher

---

## Installation

1. Clone or extract the project repository:
   ```bash
   cd SafeWork
   ```

2. Install runtime dependencies:
   ```bash
   npm install
   ```

---

## Environment Configuration

Create a `.env` file in the project root (or copy `.env.example`):
```bash
cp .env.example .env
```

Default `.env` settings:
```env
PORT=3000
SESSION_SECRET=super_secret_dev_key_safework_change_in_production
```

---

## Database Setup

To initialize a fresh SQLite database pre-populated with schema constraints, sample departments, the 5 training modules, and demonstration accounts:

```bash
npm run setup
```

---

## Running the Application

Start the Express web server:
```bash
npm start
```

Open your browser and navigate to:
- **Main Portal:** `http://localhost:3000`
- **Login Page:** `http://localhost:3000/login.html`
- **Promotional Website:** `http://localhost:3000/safetech/index.html`

---

## Running Tests

SafeWork includes an automated test suite verifying database integrity, API routes, RBAC security, and headless browser simulation across all 5 modules:

1. **Master Test Suite (API + Puppeteer E2E Simulation):**
   ```bash
   npm test
   ```

2. **Official B6 Regression Suite:**
   ```bash
   npm run test:b6
   ```

3. **Syntax Integrity Check:**
   ```bash
   npm run test:syntax
   ```

---

## Demo Accounts

The database is seeded with realistic demonstration accounts:

| Role | Name | Email | Password | Pre-Seeded Context |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Admin User | `admin@northgate.com` | `Admin@2026` | Full platform management access |
| **Supervisor** | Sarah Supervisor | `sarah.s@northgate.com` | `SarahSup!123` | Logistics team supervisor with 7 workers |
| **Worker** | Alex Kumar | `alex.k@northgate.com` | `AlexK_pass1` | 2 Passed, 1 Failed (*Hazard Awareness*), 1 In Progress |
| **Worker** | Sam Patel | `sam.p@northgate.com` | `SamP_pass2` | 1 Passed, 1 In Progress, 1 Overdue (*Fire Safety*) |
| **Worker** | Riley Chen | `riley.c@northgate.com` | `RileyC_pass3` | 1 Passed, 1 Overdue (*PPE Awareness*) |

---

## Security Features

- **Encrypted Password Storage:** Passwords hashed using `bcrypt` with 10 salt rounds.
- **Session Security:** State maintained via `express-session` using `httpOnly` cookies and strict session invalidation on logout.
- **SQL Injection Defense:** $100\%$ parameterized prepared statements across all SQLite queries.
- **Cross-Site Scripting (XSS) & Clickjacking Defenses:** Helmet.js Content Security Policy (CSP) and frame guard directives.
- **Role-Based Gating:** Strict server-side route guards (`requireAuth`, `requireRole`) preventing unauthorized privilege escalation.
- **Audit Logging:** System actions (`LOGIN`, `ASSIGN`, `ASSESSMENT_FAIL`, `RESET`, `CREATE`, `UPDATE`) logged with user IDs and timestamps.

---

## Known Prototype Limitations

- **Email Dispatch:** Email reminder notifications are simulated within the application interface; integration with external SMTP relays (e.g. SendGrid/AWS SES) is reserved for production deployment.
- **Single-Tenant Architecture:** Designed as an on-premise/single-tenant enterprise solution for Northgate Logistics.
- **Local Storage Engine:** Uses file-based SQLite3 suitable for demonstration and standalone deployment; production scaling would transition to PostgreSQL.

---

## Troubleshooting

- **Port Conflict (`EADDRINUSE: 3000`):** Set a different port in your `.env` file (e.g. `PORT=3001`) or terminate any existing background Node processes.
- **Database Reset Required:** If testing data becomes cluttered, execute `npm run setup` to restore the original clean demonstration state.
