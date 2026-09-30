const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Starting server...');
    const serverProcess = spawn('node', ['src/server.js'], { stdio: 'inherit' });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Logging in...');
    await page.goto('http://localhost:3000/login.html');
    await page.type('#email', 'sam.p@northgate.com');
    await page.type('#password', 'SamP_pass2');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
    ]);

    // Go to My Training
    await page.click('#nav-training');
    await new Promise(resolve => setTimeout(resolve, 500));

    // B6-04 — Quiz / Question Progress
    // We need to start a module, go through slides, scenario, and enter quiz
    // Let's intercept API calls to make sure a module is ready, or we can just click "Start" on any module.
    // Looking at worker.js, `startModule(moduleId, assignmentId)` opens the module.
    console.log('Starting a module to get to Quiz...');
    // Execute a JS snippet in the page to trigger `startModule` and bypass slides/scenarios
    await page.evaluate(() => {
        // Find a module that is not passed
        const assignment = allAssignments.find(a => getEffectiveStatus(a) !== 'Passed');
        if(assignment) {
            startModule(assignment.module_id, assignment.id);
        }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now we are at content slides. Skip to quiz by executing JS:
    console.log('Skipping to quiz...');
    await page.evaluate(() => {
        showQuizView(); // jump straight to quiz
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // We are now on B6-04
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-04-Quiz-Progress.png' });
    console.log('Saved B6-04-Quiz-Progress.png');
    
    // B6-05 — Assessment Result (Pass)
    console.log('Faking a Passed Assessment Result...');
    await page.evaluate(() => {
        showQuizResult({
            passed: true,
            score: 90,
            pass_mark: 70,
            correct_answers: 9,
            total_questions: 10,
            question_results: [
                {
                    is_correct: true,
                    question_text: "What is manual handling?",
                    submitted_answer: "Lifting or moving loads by hand or bodily force",
                    correct_answer: "Lifting or moving loads by hand or bodily force",
                    explanation: "Correctly identifies the definition."
                },
                {
                    is_correct: false,
                    question_text: "Is it okay to run in the warehouse?",
                    submitted_answer: "Yes, if you're in a hurry",
                    correct_answer: "No, never",
                    explanation: "Running causes slips and collisions."
                }
            ]
        });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-05-Assessment-Pass.png' });
    console.log('Saved B6-05-Assessment-Pass.png');

    // B6-06 — Failed Assessment / Retake
    console.log('Faking a Failed Assessment Result...');
    await page.evaluate(() => {
        showQuizResult({
            passed: false,
            score: 55,
            pass_mark: 70,
            correct_answers: 5,
            total_questions: 10,
            question_results: [
                {
                    is_correct: false,
                    question_text: "When should you wear hi-vis?",
                    submitted_answer: "Only at night",
                    correct_answer: "At all times on the warehouse floor",
                    explanation: "Hi-vis is mandatory at all times."
                }
            ]
        });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'C:/Users/Expert/.gemini/antigravity/brain/64628d36-3f06-4d0d-b24a-69bc8eefd0bf/B6-06-Assessment-Failed.png' });
    console.log('Saved B6-06-Assessment-Failed.png');

    await browser.close();
    serverProcess.kill();
    console.log('Done.');
    process.exit(0);
}

run().catch(console.error);
