const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function run() {
    console.log('Starting server...');
    const serverProcess = spawn('node', ['src/server.js'], { stdio: 'inherit' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    // 1. Worker (Sam) -> realistic Hazard Awareness
    console.log('Logging in as Worker (Sam)...');
    await page.goto('http://localhost:3000/login.html');
    await page.type('#email', 'sam.p@northgate.com');
    await page.type('#password', 'SamP_pass2');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Jump straight to Hazard Awareness scenario
    console.log('Going to Hazard Awareness scenario...');
    await page.evaluate(() => {
        showView('module');
        renderScenarioForModule('Hazard Awareness');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-Realistic-Scenario.png' });
    console.log('Saved B6-Realistic-Scenario.png');

    // 2. Supervisor (Sarah) -> Dashboard with real data
    console.log('Logging in as Supervisor (Sarah)...');
    await page.goto('http://localhost:3000/login.html');
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('http://localhost:3000/login.html');
    await page.type('#email', 'sarah.s@northgate.com');
    await page.type('#password', 'SarahSup!123');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-Supervisor-Dashboard.png' });
    console.log('Saved B6-Supervisor-Dashboard.png');

    // 3. Admin -> User Management
    console.log('Logging in as Admin...');
    await page.goto('http://localhost:3000/login.html');
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto('http://localhost:3000/login.html');
    await page.type('#email', 'admin@northgate.com');
    await page.type('#password', 'Admin@2026');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await page.evaluate(() => { showView('users'); });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-Admin-Users.png' });
    console.log('Saved B6-Admin-Users.png');

    // 4. Admin -> Question Management
    await page.evaluate(() => { showView('questions'); });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.select('#question-module-select', '1'); // Select Manual Handling
    await page.evaluate(() => { loadQuestionsForModule(1); });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-Admin-Questions.png' });
    console.log('Saved B6-Admin-Questions.png');

    await browser.close();
    serverProcess.kill();
    console.log('Done.');
}
run().catch(console.error);
