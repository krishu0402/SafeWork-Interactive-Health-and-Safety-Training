const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'demo-screenshots');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function waitServerReady(url, maxMs = 15000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            http.get(url, (res) => {
                if (res.statusCode === 200) return resolve();
                if (Date.now() - start > maxMs) return reject(new Error('Server timeout'));
                setTimeout(check, 300);
            }).on('error', () => {
                if (Date.now() - start > maxMs) return reject(new Error('Server timeout'));
                setTimeout(check, 300);
            });
        };
        check();
    });
}

async function captureAllFinalScreenshots() {
    console.log('Starting SafeWork server...');
    const server = spawn('node', ['src/server.js'], { stdio: 'pipe' });

    try {
        await waitServerReady('http://localhost:3000/login.html');
        console.log('Server is online and ready.');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,850']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 850 });

        // =================================================================
        // WORKER FLOW: SAM PATEL (Worker Demo Journey)
        // =================================================================
        console.log('\n--- 1. Worker Sam Patel Login ---');
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'sam.p@northgate.com');
        await page.type('#password', 'SamP_pass2');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 600));

        // 01 Worker Dashboard
        await page.screenshot({ path: path.join(outDir, '01-Worker-Dashboard.png') });
        console.log('Captured 01-Worker-Dashboard.png');

        // 20 Worker Profile (Demonstrating verified Department & Last Login)
        await page.evaluate(async () => {
            await showProfile();
        });
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(outDir, '20-Worker-Profile.png') });
        console.log('Captured 20-Worker-Profile.png (Department: Warehouse Floor, Real Last Login)');

        // 02 My Training
        await page.click('#nav-training');
        await page.waitForSelector('.course-card');
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: path.join(outDir, '02-My-Training.png') });
        console.log('Captured 02-My-Training.png');

        // 03 Training Content (Fire Safety / Hazard Awareness Slides)
        await page.evaluate(() => {
            const ha = allAssignments.find(a => a.title === 'Hazard Awareness');
            if (ha) startModule(ha.module_id, ha.id);
        });
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(outDir, '03-Training-Content.png') });
        console.log('Captured 03-Training-Content.png');

        // 04 Interactive Scenario (Initial discovery state)
        await page.evaluate(() => startScenario());
        await new Promise(r => setTimeout(r, 700));
        await page.screenshot({ path: path.join(outDir, '04-Interactive-Scenario.png') });
        console.log('Captured 04-Interactive-Scenario.png');

        // 05 Hover Tooltip (Hover over Spill hotspot)
        await page.hover('#hz-1');
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: path.join(outDir, '05-Hover-Tooltip.png') });
        console.log('Captured 05-Hover-Tooltip.png');

        // 06 Investigation Panel (Click Spill hotspot)
        await page.click('#hz-1');
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: path.join(outDir, '06-Investigation-Panel.png') });
        console.log('Captured 06-Investigation-Panel.png');

        // 07 Correct Feedback (Click correct answer in panel)
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '07-Correct-Feedback.png') });
        console.log('Captured 07-Correct-Feedback.png');

        // Complete remaining hazards (hz-2 and hz-3) to trigger 08 Completed Scenario
        await new Promise(r => setTimeout(r, 2000)); // wait for panel close
        await page.click('#hz-2');
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 2200));

        await page.click('#hz-3');
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 2200));

        // 08 Completed Scenario
        await page.screenshot({ path: path.join(outDir, '08-Completed-Scenario.png') });
        console.log('Captured 08-Completed-Scenario.png');

        // 09 Assessment (Quiz view with question progress)
        await page.evaluate(() => showQuizView());
        await new Promise(r => setTimeout(r, 700));
        // Select an answer option to show active micro-interaction
        const radio1 = await page.$('input[name="quiz_answer"]');
        if (radio1) await radio1.click();
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({ path: path.join(outDir, '09-Assessment.png') });
        console.log('Captured 09-Assessment.png');

        // 10 Failed Assessment (Demonstrating fail result, 70% pass mark, explanations & retake)
        await page.evaluate(() => {
            showQuizResult({
                passed: false,
                score: 25,
                pass_mark: 70,
                correct_answers: 1,
                total_questions: 4,
                question_results: [
                    {
                        is_correct: false,
                        question_text: "What should you do immediately upon discovering a fire in the warehouse?",
                        submitted_answer: "Finish counting the current stock pallet first",
                        correct_answer: "Activate the nearest fire alarm and evacuate immediately",
                        explanation: "Evacuation must begin immediately. Seconds count in a real fire; belongings and stock must be left behind."
                    },
                    {
                        is_correct: true,
                        question_text: "Where should you report after evacuating the building?",
                        submitted_answer: "The designated Fire Assembly Point",
                        correct_answer: "The designated Fire Assembly Point",
                        explanation: "You must remain at the designated assembly point until roll call is verified."
                    },
                    {
                        is_correct: false,
                        question_text: "Which type of fire extinguisher must NEVER be used on electrical equipment?",
                        submitted_answer: "Carbon Dioxide (CO2)",
                        correct_answer: "Water extinguisher",
                        explanation: "Water conducts electricity and creates a lethal risk of electrocution on live electrical fires."
                    },
                    {
                        is_correct: false,
                        question_text: "When is it acceptable to re-enter a building during a fire alarm?",
                        submitted_answer: "When you forgot your car keys and phone",
                        correct_answer: "Only after the official all-clear is given by the Fire Warden",
                        explanation: "Never re-enter a building until authorized by emergency personnel or the fire warden."
                    }
                ]
            });
        });
        await new Promise(r => setTimeout(r, 700));
        await page.screenshot({ path: path.join(outDir, '10-Failed-Assessment.png') });
        console.log('Captured 10-Failed-Assessment.png');

        // 11 Certificate (Official SafeWork Certificate for Sam Patel)
        await page.goto('http://localhost:3000/api/assignments/6/certificate');
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(outDir, '11-Certificate.png') });
        console.log('Captured 11-Certificate.png');

        // 12 Training History
        await page.goto('http://localhost:3000/worker.html');
        await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
        await page.click('#nav-history');
        await new Promise(r => setTimeout(r, 700));
        await page.screenshot({ path: path.join(outDir, '12-Training-History.png') });
        console.log('Captured 12-Training-History.png');

        // Logout Worker
        await page.evaluate(() => logout());
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // =================================================================
        // SUPERVISOR FLOW: SARAH SUPERVISOR
        // =================================================================
        console.log('\n--- 2. Supervisor Sarah Supervisor Login ---');
        await page.type('#email', 'sarah.s@northgate.com');
        await page.type('#password', 'SarahSup!123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 800));

        // 13 Supervisor Dashboard
        await page.screenshot({ path: path.join(outDir, '13-Supervisor-Dashboard.png') });
        console.log('Captured 13-Supervisor-Dashboard.png');

        // 14 Supervisor Employee/Assignment (Employees view with modal open)
        await page.click('#nav-employees');
        await new Promise(r => setTimeout(r, 600));
        await page.evaluate(() => {
            if (typeof showAssignModal === 'function') showAssignModal(4); // Sam Patel
        });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: path.join(outDir, '14-Supervisor-Employee-Assignment.png') });
        console.log('Captured 14-Supervisor-Employee-Assignment.png');
        await page.evaluate(() => closeModal('assign-modal'));

        // 15 Supervisor Report
        await page.click('#nav-reports');
        await new Promise(r => setTimeout(r, 700));
        await page.screenshot({ path: path.join(outDir, '15-Supervisor-Report.png') });
        console.log('Captured 15-Supervisor-Report.png');

        // Logout Supervisor
        await page.evaluate(() => logout());
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // =================================================================
        // ADMINISTRATOR FLOW: ADMIN USER
        // =================================================================
        console.log('\n--- 3. Administrator Login ---');
        await page.type('#email', 'admin@northgate.com');
        await page.type('#password', 'Admin@2026');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 800));

        // 16 Admin Dashboard
        await page.screenshot({ path: path.join(outDir, '16-Admin-Dashboard.png') });
        console.log('Captured 16-Admin-Dashboard.png');

        // 17 Admin User Management
        await page.evaluate(() => showView('users'));
        await new Promise(r => setTimeout(r, 700));
        await page.screenshot({ path: path.join(outDir, '17-Admin-User-Management.png') });
        console.log('Captured 17-Admin-User-Management.png');

        // 18 Admin Module/Question Management
        await page.evaluate(() => showView('questions'));
        await new Promise(r => setTimeout(r, 700));
        await page.screenshot({ path: path.join(outDir, '18-Admin-Module-Question-Management.png') });
        console.log('Captured 18-Admin-Module-Question-Management.png');

        // =================================================================
        // SAFETECH PROMOTIONAL WEBSITE
        // =================================================================
        console.log('\n--- 4. SafeTech Website ---');
        await page.goto('http://localhost:3000/safetech/index.html');
        await new Promise(r => setTimeout(r, 800));
        // 19 SafeTech Promotional Website
        await page.screenshot({ path: path.join(outDir, '19-SafeTech-Promotional-Website.png') });
        console.log('Captured 19-SafeTech-Promotional-Website.png');

        console.log('\n======================================================');
        console.log('ALL 20 FINAL EVIDENCE SCREENSHOTS SUCCESSFULLY CAPTURED');
        console.log('Destination folder:', outDir);
        console.log('======================================================\n');

        await browser.close();
        server.kill();
    } catch (err) {
        console.error('Screenshot capture error:', err);
        server.kill();
    }
}

captureAllFinalScreenshots();
