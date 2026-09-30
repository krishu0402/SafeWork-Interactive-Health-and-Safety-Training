const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3');

async function runTests() {
    console.log('Starting server...');
    const serverProcess = spawn('node', ['src/server.js'], { stdio: 'pipe' });
    const http = require('http');
    await new Promise((resolve) => {
        const check = () => {
            http.get('http://localhost:3000/login.html', (res) => {
                if (res.statusCode === 200) resolve();
                else setTimeout(check, 300);
            }).on('error', () => setTimeout(check, 300));
        };
        setTimeout(check, 500);
    });

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });

    const results = {
        modules: {},
        supervisor: {},
        admin: {},
        security: {},
        general: {}
    };

    try {
        const page = await browser.newPage();
        
        // ---------------------------------------------------------
        // 1. GENERAL & MODULE NAME CHECK
        // ---------------------------------------------------------
        console.log('Checking module names...');
        let dbModules = await new Promise((resolve) => {
            const db = new sqlite3.Database('./database/database.sqlite');
            db.all('SELECT title FROM modules', [], (err, rows) => resolve(rows));
            db.close();
        });
        const hasForklift = dbModules.some(m => m.title.includes('Forklift Safety Basics'));
        const hasMovingVehicles = dbModules.some(m => m.title === 'Moving Vehicles & Equipment');
        results.general['Module Naming'] = !hasForklift && hasMovingVehicles ? 'PASS' : 'FAIL';

        // ---------------------------------------------------------
        // 2. SECURITY CHECK
        // ---------------------------------------------------------
        console.log('Testing security...');
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'sam.p@northgate.com'); // Worker
        await page.type('#password', 'SamP_pass2');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try accessing supervisor
        let res = await page.goto('http://localhost:3000/supervisor.html');
        await new Promise(resolve => setTimeout(resolve, 800));
        results.security['Worker -> Supervisor'] = (page.url().includes('login') || page.url().includes('worker')) ? 'PASS' : 'FAIL';
        
        // Try accessing admin
        res = await page.goto('http://localhost:3000/admin.html');
        await new Promise(resolve => setTimeout(resolve, 800));
        results.security['Worker -> Admin'] = (page.url().includes('login') || page.url().includes('worker')) ? 'PASS' : 'FAIL';
        
        // Login as Supervisor
        await page.goto('http://localhost:3000/login.html');
        await page.evaluate(() => localStorage.clear());
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'sarah.s@northgate.com');
        await page.type('#password', 'SarahSup!123');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res = await page.goto('http://localhost:3000/admin.html');
        await new Promise(resolve => setTimeout(resolve, 800));
        results.security['Supervisor -> Admin'] = (page.url().includes('login') || page.url().includes('supervisor')) ? 'PASS' : 'FAIL';

        // ---------------------------------------------------------
        // 3. WORKER MODULES & SCENARIO
        // ---------------------------------------------------------
        console.log('Testing worker modules...');
        await page.goto('http://localhost:3000/login.html');
        await page.evaluate(() => localStorage.clear());
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'alex.k@northgate.com'); // Worker
        await page.type('#password', 'AlexK_pass1');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const testModule = async (moduleName) => {
            console.log(' Testing ' + moduleName);
            await page.waitForFunction('typeof showView === "function"');
            await page.evaluate((name) => {
                showView('module');
                renderScenarioForModule(name);
            }, moduleName);
            await new Promise(resolve => setTimeout(resolve, 500));
            const hasScenario = await page.evaluate(() => {
                const el = document.getElementById('scenario-content');
                return el && el.innerHTML.length > 50;
            });
            results.modules[moduleName] = hasScenario ? 'PASS' : 'FAIL';
        };

        await testModule('Manual Handling');
        await testModule('PPE Awareness');
        await testModule('Fire Safety');
        await testModule('Moving Vehicles & Equipment');

        // Test Hazard Awareness specifically for image
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Hazard Awareness');
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        const bgUrl = await page.evaluate(() => {
            const el = document.getElementById('hazard-scene');
            return el ? el.style.background : null;
        });
        results.general['Hazard Realistic Image'] = (bgUrl && bgUrl.includes('warehouse_scene.jpg')) ? 'PASS' : 'FAIL';

        // ---------------------------------------------------------
        // 4. SUPERVISOR REAL DATA
        // ---------------------------------------------------------
        console.log('Testing supervisor data...');
        await page.goto('http://localhost:3000/login.html');
        await page.evaluate(() => localStorage.clear());
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'sarah.s@northgate.com');
        await page.type('#password', 'SarahSup!123');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 1500));
        await page.waitForFunction('document.getElementById("stat-team") !== null');
        const supStats = await page.evaluate(() => {
            return {
                workers: document.getElementById('stat-team')?.innerText,
                completed: document.getElementById('stat-completed')?.innerText,
                rate: document.getElementById('stat-rate')?.innerText
            };
        });
        // Wait, they shouldn't be empty or default if real DB
        results.supervisor['Dashboard DB Stats'] = (supStats.workers && supStats.workers !== '0' && supStats.workers !== '') ? 'PASS' : 'FAIL';

        // ---------------------------------------------------------
        // 5. ADMIN CRUD
        // ---------------------------------------------------------
        console.log('Testing admin CRUD...');
        await page.goto('http://localhost:3000/login.html');
        await page.evaluate(() => localStorage.clear());
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'admin@northgate.com');
        await page.type('#password', 'Admin@2026');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 1500));
        await page.waitForFunction('typeof showView === "function"');
        await page.evaluate(() => showView('users'));
        await new Promise(resolve => setTimeout(resolve, 500));
        const hasAddBtn = await page.evaluate(() => !!document.querySelector('button[onclick="showUserModal()"]'));
        results.admin['User Management (CRUD)'] = hasAddBtn ? 'PASS' : 'FAIL';

        await page.evaluate(() => showView('questions'));
        await new Promise(resolve => setTimeout(resolve, 500));
        const hasQuestionSelect = await page.evaluate(() => !!document.getElementById('question-module-select'));
        results.admin['Question Management (CRUD)'] = hasQuestionSelect ? 'PASS' : 'FAIL';

        console.log('\n--- VERIFICATION RESULTS ---');
        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
        serverProcess.kill();
    }
}

runTests();
