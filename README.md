SafeTech Solutions - Interactive Health and Safety Training System
================================================================

This prototype is the final deliverable for the CET257 Enterprise Project (Assignment 1 - Task A7).

## Prerequisites
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

## How to Run the Prototype
1. Open your terminal or command prompt and navigate to the project directory:
   `cd c:\Users\Expert\OneDrive\Desktop\SafeWork`
2. Install the necessary dependencies (if not already installed):
   `npm install`
3. Start the server:
   `npm run start`
4. You should see the message: `SafeWork server is running on port 3000`.
5. Open your web browser and navigate to: `http://localhost:3000`

## Demo Login Credentials

**1. Administrator**
- **Email:** admin@northgate.com | **Password:** Admin@2026
- *Features:* New Grid-based Action Dashboard, Compliance progress bars, manage users, create/edit training modules, send training reminders via Toast notifications.

**2. Supervisor**
- **Email:** sarah.s@northgate.com | **Password:** SarahSup!123
- *Features:* Dual-Chart Dashboard (Trend Line & Agency Bar Chart), view team completion metrics, assign specific modules and due dates.

**3. Workers (Trainees)**
- **Alex Kumar:** `alex.k@northgate.com` | **Password:** AlexK_pass1
- **Sam Patel:** `sam.p@northgate.com` | **Password:** SamP_pass2
- **Riley Chen:** `riley.c@northgate.com` | **Password:** RileyC_pass3
- **Taylor Morgan:** `taylor.m@northgate.com` | **Password:** TaylorM_pass4
- **Priya Shah:** `priya.s@northgate.com` | **Password:** PriyaS_pass5
- **Chris Wilson:** `chris.w@northgate.com` | **Password:** ChrisW_pass6

- *Worker Features:* Visually rich Course Grid, interactive hazard scenarios, real-time quizzes, "Valid" certification badges, download CSV reports, and view/print completion certificates.

## Architecture & Security
- **Frontend:** Vanilla JavaScript, HTML5, CSS3, Chart.js for interactive analytics.
- **Backend:** Node.js, Express.
- **Database:** SQLite3.
- **Security:** Helmet for Content Security Policy (CSP), Express-Session for secure cookies, and bcrypt (10-round salt) for strong 256-bit encrypted password authentication.
