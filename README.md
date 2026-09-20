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

## Architecture & Security
- **Frontend:** Vanilla JavaScript, HTML5, CSS3, Chart.js for interactive analytics.
- **Backend:** Node.js, Express.
- **Database:** SQLite3.
- **Security:** Helmet for Content Security Policy (CSP), Express-Session for secure cookies, and bcrypt (10-round salt) for strong 256-bit encrypted password authentication.
