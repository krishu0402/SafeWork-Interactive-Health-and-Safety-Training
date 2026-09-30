const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');

async function testProfile() {
    const server = spawn('node', ['src/server.js'], { stdio: 'pipe' });
    await new Promise(r => setTimeout(r, 2000));

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('http://localhost:3000/login.html');
    await page.type('#email', 'sam.p@northgate.com');
    await page.type('#password', 'SamP_pass2');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    await page.evaluate(async () => {
        await showProfile();
    });
    await new Promise(r => setTimeout(r, 1000));

    const profileData = await page.evaluate(() => ({
        name: document.getElementById('profile-name').innerText,
        email: document.getElementById('profile-email').innerText,
        dept: document.getElementById('profile-dept').innerText,
        login: document.getElementById('profile-login').innerText
    }));

    console.log('PROFILE DISPLAY DATA:', JSON.stringify(profileData, null, 2));

    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/507caebc-b06b-42c7-a463-58839c5dcccf/demo-screenshots/Verified-Worker-Profile.png' });
    console.log('Saved Verified-Worker-Profile.png');

    await browser.close();
    server.kill();
}
testProfile();
