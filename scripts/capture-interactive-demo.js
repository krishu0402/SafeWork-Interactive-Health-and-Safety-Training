const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const outDir = 'C:/Users/Expert/.gemini/antigravity/brain/507caebc-b06b-42c7-a463-58839c5dcccf/demo-screenshots';
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

async function captureDemo() {
    console.log('Starting SafeWork server...');
    const server = spawn('node', ['src/server.js'], { stdio: 'inherit' });
    await waitServerReady('http://localhost:3000/login.html');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 850 });

    try {
        console.log('Logging in as Worker Alex Kumar...');
        await page.goto('http://localhost:3000/login.html');
        await page.type('#email', 'alex.k@northgate.com');
        await page.type('#password', 'AlexK_pass1');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // 1. Worker Dashboard
        await page.screenshot({ path: path.join(outDir, '01-Worker-Dashboard.png') });
        console.log('Saved 01-Worker-Dashboard.png');

        // 2. My Training Page
        await page.click('#nav-training');
        await page.waitForSelector('.course-card');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '02-My-Training-Courses.png') });
        console.log('Saved 02-My-Training-Courses.png');

        // 3. Hazard Awareness Scene (Initial discover state)
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Hazard Awareness');
        });
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: path.join(outDir, '03-Hazard-Awareness-Scene.png') });
        console.log('Saved 03-Hazard-Awareness-Scene.png');

        // 4. Hover over Liquid Spill (Tooltip shown)
        await page.hover('#hz-1');
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: path.join(outDir, '04-Spill-Hover-Tooltip.png') });
        console.log('Saved 04-Spill-Hover-Tooltip.png');

        // 5. Click Spill -> Investigation Panel
        await page.click('#hz-1');
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: path.join(outDir, '05-Spill-Investigation-Panel.png') });
        console.log('Saved 05-Spill-Investigation-Panel.png');

        // 6. Select Correct Action -> Success feedback in panel
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '06-Panel-Correct-Feedback.png') });
        console.log('Saved 06-Panel-Correct-Feedback.png');

        // Wait for panel to close and progress to update
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(outDir, '07-Spill-Completed-Progress-1of3.png') });
        console.log('Saved 07-Spill-Completed-Progress-1of3.png');

        // 7. Complete second hazard (Blocked Exit)
        await page.click('#hz-2');
        await new Promise(r => setTimeout(r, 600));
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 2200));

        // 8. Complete third hazard (Loose Cable)
        await page.click('#hz-3');
        await new Promise(r => setTimeout(r, 600));
        await page.click('button[data-correct="true"]');
        await new Promise(r => setTimeout(r, 2200));

        // 9. All 3 Hazards Completed & Scene Complete Overlay
        await page.screenshot({ path: path.join(outDir, '08-All-Hazards-Completed-Proceed.png') });
        console.log('Saved 08-All-Hazards-Completed-Proceed.png');

        // 10. Manual Handling Interactive Scene
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Manual Handling');
        });
        await new Promise(r => setTimeout(r, 600));
        await page.hover('#mh-back');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '09-Manual-Handling-Interactive.png') });
        console.log('Saved 09-Manual-Handling-Interactive.png');

        // 11. PPE Awareness Interactive Scene
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('PPE Awareness');
        });
        await new Promise(r => setTimeout(r, 600));
        await page.hover('#ppe-boots');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '10-PPE-Awareness-Interactive.png') });
        console.log('Saved 10-PPE-Awareness-Interactive.png');

        // 12. Fire Safety Interactive Scene
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Fire Safety');
        });
        await new Promise(r => setTimeout(r, 600));
        await page.hover('#fire-source');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '11-Fire-Safety-Interactive.png') });
        console.log('Saved 11-Fire-Safety-Interactive.png');

        // 13. Moving Vehicles Interactive Scene
        await page.evaluate(() => {
            showView('module');
            renderScenarioForModule('Moving Vehicles & Equipment');
        });
        await new Promise(r => setTimeout(r, 600));
        await page.hover('#veh-forklift');
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, '12-Moving-Vehicles-Interactive.png') });
        console.log('Saved 12-Moving-Vehicles-Interactive.png');

        console.log('\nAll demo screenshots captured successfully in:', outDir);
    } catch (e) {
        console.error('Error during screenshot capture:', e);
    } finally {
        await browser.close();
        server.kill();
    }
}

captureDemo();
