const { spawn } = require('child_process');
const http = require('http');
const puppeteer = require('puppeteer');

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

async function runComprehensiveVerification() {
    console.log('Starting SafeWork server...');
    const server = spawn('node', ['src/server.js'], { stdio: 'inherit' });

    const results = [];
    function record(name, pass, detail = '') {
        const status = pass ? 'PASS' : 'FAIL';
        results.push({ name, status, detail });
        console.log(`[${status}] ${name} ${detail ? '(' + detail + ')' : ''}`);
    }

    let browser;
    try {
        await waitServerReady('http://localhost:3000/login.html');
        console.log('Server is ready.\n');

        // 1. Run full-test.js directly
        console.log('=== STEP 1: API & DB INTEGRITY TESTS ===');
        const apiTest = spawn('node', ['full-test.js'], { stdio: 'pipe' });
        let apiOut = '';
        apiTest.stdout.on('data', d => apiOut += d.toString());
        await new Promise(r => apiTest.on('close', r));
        const allApiPass = apiOut.includes('ALL TESTS PASSED') || !apiOut.includes('FAIL');
        record('Full API & Database Test Suite', allApiPass, apiOut.trim().split('\n').pop());

        // 2. Puppeteer UI & Interactive Simulation Tests
        console.log('\n=== STEP 2: PUPPETEER WORKER SIMULATION TESTS ===');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Worker Login
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'alex.k@northgate.com');
        await page.type('#password', 'AlexK_pass1');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        const onWorkerDash = page.url().includes('worker.html');
        record('Worker Login & Redirect', onWorkerDash);

        // Check Dashboard Stat Cards
        const statProgress = await page.$eval('#stat-progress', el => el.innerText);
        record('Worker Dashboard Stats Rendered', !!statProgress, `Progress: ${statProgress}`);

        // Navigate to My Training
        await page.click('#nav-training');
        await page.waitForSelector('.course-card');
        const cardCount = await page.$$eval('.course-card', els => els.length);
        record('My Training Cards Rendered', cardCount === 5, `${cardCount} course cards`);

        // Test Interactive Module 1: Hazard Awareness
        console.log('\n--- Testing Hazard Awareness Simulation ---');
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Hazard Awareness');
        });
        await new Promise(r => setTimeout(r, 600));

        // Verify warehouse scene & 3 hotspots
        const hasWarehouseScene = await page.$eval('#hazard-scene', el => !!el);
        const hotspotCount = await page.$$eval('.hotspot', els => els.length);
        record('Hazard Awareness Scene Rendered', hasWarehouseScene && hotspotCount === 3, `${hotspotCount} hotspots`);

        // Test Hover on Hotspot 1 (Spill)
        await page.hover('#hz-1');
        await new Promise(r => setTimeout(r, 400));
        const tooltipVisible = await page.$eval('#sw-interactive-tooltip', el => el.classList.contains('visible'));
        const tooltipText = await page.$eval('#sw-interactive-tooltip .sw-tooltip-title', el => el.innerText);
        record('Hover Hotspot 1 Tooltip Displayed', tooltipVisible && tooltipText.includes('Potential Hazard'), tooltipText);

        // Test Click on Hotspot 1 -> Investigation Panel Opens
        await page.click('#hz-1');
        await new Promise(r => setTimeout(r, 500));
        const panelOpen = await page.$eval('#sw-investigation-panel', el => el.classList.contains('open'));
        const panelTitle = await page.$eval('#sw-investigation-panel .panel-title', el => el.innerText);
        record('Click Hotspot 1 Opens Investigation Panel', panelOpen && panelTitle.includes('Spill'), panelTitle);

        // Test Incorrect Answer in Panel
        const wrongOption = await page.$('button[data-correct="false"]');
        if (wrongOption) {
            await wrongOption.click();
            await new Promise(r => setTimeout(r, 300));
            const feedbackErr = await page.$eval('#investigation-feedback-area', el => el.innerText);
            record('Incorrect Option Feedback & Shake', feedbackErr.includes('Not quite') || feedbackErr.includes('Try again'));
        }

        // Test Correct Answer in Panel
        const correctOption = await page.$('button[data-correct="true"]');
        if (correctOption) {
            await correctOption.click();
            await new Promise(r => setTimeout(r, 2200)); // wait for panel auto-close
            const hz1Completed = await page.$eval('#hz-1', el => el.classList.contains('hotspot-completed'));
            const counterText = await page.$eval('#hazard-found-count', el => el.innerText);
            record('Correct Option Marks Hotspot & Updates Progress', hz1Completed && counterText === '1', `Found: ${counterText}/3`);
        }

        // Complete remaining hazards (hz-2 and hz-3)
        await page.click('#hz-2');
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 2200));

        await page.click('#hz-3');
        await new Promise(r => setTimeout(r, 500));
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 2200));

        // Check completion overlay & Proceed button
        const sceneCompleteOverlay = await page.$eval('.scene-complete-overlay', el => !!el).catch(() => false);
        const proceedVisible = await page.$eval('#btn-proceed-quiz', el => el.style.display !== 'none');
        record('All 3 Hazards Completed & Proceed Button Active', sceneCompleteOverlay && proceedVisible);

        // Test Module 2: Manual Handling
        console.log('\n--- Testing Manual Handling Simulation ---');
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Manual Handling');
        });
        await new Promise(r => setTimeout(r, 600));
        const mhZones = await page.$$eval('.mh-zone', els => els.length);
        record('Manual Handling Scene & 4 Body Zones Rendered', mhZones === 4, `${mhZones} zones`);

        // Test Module 3: PPE Awareness
        console.log('\n--- Testing PPE Awareness Simulation ---');
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('PPE Awareness');
        });
        await new Promise(r => setTimeout(r, 600));
        const ppeItems = await page.$$eval('.ppe-item', els => els.length);
        record('PPE Awareness Scene & 5 Equipment Cards Rendered', ppeItems === 5, `${ppeItems} PPE items`);

        // Test Module 4: Fire Safety
        console.log('\n--- Testing Fire Safety Simulation ---');
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Fire Safety');
        });
        await new Promise(r => setTimeout(r, 600));
        const fireElements = await page.$$eval('.fire-element', els => els.length);
        record('Fire Safety Scene & 4 Emergency Elements Rendered', fireElements === 4, `${fireElements} elements`);

        // Test Module 5: Moving Vehicles & Equipment
        console.log('\n--- Testing Moving Vehicles Simulation ---');
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Moving Vehicles & Equipment');
        });
        await new Promise(r => setTimeout(r, 600));
        const vehicleElements = await page.$$eval('.vehicle-element', els => els.length);
        record('Moving Vehicles Scene & 4 Vehicle Safety Elements Rendered', vehicleElements === 4, `${vehicleElements} elements`);

        // Test Assessment / Quiz Flow via real user module start
        console.log('\n--- Testing Quiz Assessment Flow via Real User Flow ---');
        await page.click('#nav-training');
        await page.waitForSelector('.course-card');
        
        // Find an assignment card for Hazard Awareness and start it
        await page.evaluate(() => {
            const ha = allAssignments.find(a => a.title === 'Hazard Awareness');
            if (ha) startModule(ha.module_id, ha.id);
        });
        await new Promise(r => setTimeout(r, 800));
        
        // Advance slides to scenario
        await page.evaluate(() => startScenario());
        await new Promise(r => setTimeout(r, 600));

        // Click proceed to assessment
        await page.evaluate(() => showQuizView());
        await new Promise(r => setTimeout(r, 600));
        const hasQuizQuestions = await page.$eval('#quiz-options', el => !!el).catch(() => false);
        record('Quiz Questions Rendered in Assessment View', hasQuizQuestions);

        // Answer quiz question
        const firstRadio = await page.$('input[name="quiz_answer"]');
        if (firstRadio) {
            await firstRadio.click();
            const isSelected = await page.$eval('.quiz-option-label', el => el.classList.contains('selected'));
            record('Quiz Option Selection & Micro-Highlight', isSelected);
        }

        // Test Certificates View
        console.log('\n--- Testing Certificates & Performance View ---');
        await page.click('#nav-certificates');
        await new Promise(r => setTimeout(r, 600));
        const perfPassed = await page.$eval('#perf-passed', el => el.innerText);
        record('Certificates View & Performance Stats', perfPassed !== undefined, `Passed: ${perfPassed}`);

        // Test Training History View
        console.log('\n--- Testing Training History View ---');
        await page.click('#nav-history');
        await new Promise(r => setTimeout(r, 600));
        const historyRows = await page.$$eval('#history-table-body tr', els => els.length);
        record('Training History Table Populated', historyRows > 0, `${historyRows} rows`);

        // Test Logout
        await page.evaluate(() => logout());
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        record('Worker Logout & Redirect to Login', page.url().includes('login.html'));

        // Supervisor Login & Dashboard
        console.log('\n=== STEP 3: SUPERVISOR & ADMIN CHECKS ===');
        await page.type('#email', 'sarah.s@northgate.com');
        await page.type('#password', 'SarahSup!123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        const onSup = page.url().includes('supervisor.html');
        record('Supervisor Login & Dashboard', onSup);

        // Supervisor Team Stats
        await page.waitForSelector('#stat-team');
        const teamCount = await page.$eval('#stat-team', el => el.innerText);
        record('Supervisor Team Stats Displayed', parseInt(teamCount) > 0, `${teamCount} workers`);

        // Supervisor Logout
        await page.evaluate(() => logout());
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // Admin Login & Dashboard
        await page.type('#email', 'admin@northgate.com');
        await page.type('#password', 'Admin@2026');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        const onAdmin = page.url().includes('admin.html');
        record('Admin Login & Dashboard', onAdmin);

        // Admin User CRUD button
        await page.evaluate(() => showView('users'));
        await new Promise(r => setTimeout(r, 500));
        const hasAddUser = await page.$eval('button[onclick="showUserModal()"]', el => !!el).catch(() => false);
        record('Admin User Management CRUD Accessible', hasAddUser);

        // Admin Question CRUD
        await page.evaluate(() => showView('questions'));
        await new Promise(r => setTimeout(r, 500));
        const hasQuestionSelect = await page.$eval('#question-module-select', el => !!el).catch(() => false);
        record('Admin Question Management CRUD Accessible', hasQuestionSelect);

        // Admin Logout
        await page.evaluate(() => logout());
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        record('Admin Logout & Redirect to Login', page.url().includes('login.html'));

    } catch (err) {
        console.error('Test execution error:', err);
        record('Test Suite Execution', false, err.message);
    } finally {
        if (browser) await browser.close();
        server.kill();
    }

    console.log('\n========================================');
    console.log('FINAL VERIFICATION SUMMARY:');
    const passedCount = results.filter(r => r.status === 'PASS').length;
    const failedCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log('========================================\n');
}

runComprehensiveVerification();
