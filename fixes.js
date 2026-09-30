const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { db, run, get, all } = require('./src/config/database');

async function doFixes() {
    console.log('Starting fixes...');

    // 1. Fix CSV encodings and Date Formats
    const filesToFix = [
        'public/js/worker.js',
        'public/js/supervisor.js',
        'public/js/admin.js'
    ];
    for (const file of filesToFix) {
        const filePath = path.join(__dirname, file);
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/new Blob\(\[csv\], \{ type: 'text\/csv' \}\)/g, "new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })");
        
        // Also modify formatDate to output YYYY-MM-DD to avoid Excel ######## issues with British dates if columns are small
        // Actually, let's keep the dates as is but modify the format inside the CSV generation only if needed.
        // Wait, the user said "The ######## is usually a column-width/date-display issue, while – indicates an encoding problem."
        // We added UTF-8 BOM which fixes the dash encoding. For dates, let's change formatDate logic inside CSV functions or globally?
        // Let's modify globally:
        content = content.replace(/new Date\(d\).toLocaleDateString\('en-GB', \{ day: 'numeric', month: 'short', year: 'numeric' \}\)/g, "new Date(d).toLocaleDateString('en-CA')"); // en-CA gives YYYY-MM-DD
        
        fs.writeFileSync(filePath, content);
        console.log('Fixed CSV encoding in', file);
    }

    // 2. Remove watermark from assignmentRoutes.js
    const routesPath = path.join(__dirname, 'src/routes/assignmentRoutes.js');
    let routesContent = fs.readFileSync(routesPath, 'utf8');
    routesContent = routesContent.replace(/<div class="watermark">.*?<\/div>/g, '');
    routesContent = routesContent.replace(/\.watermark\s*\{.*?\}/g, '');
    fs.writeFileSync(routesPath, routesContent);
    console.log('Removed watermark from assignmentRoutes.js');

    // 3. Reset Alex's password
    const alexHash = await bcrypt.hash('AlexK_pass1', 10);
    await run("UPDATE users SET password_hash = ? WHERE email = 'alex.k@northgate.com'", [alexHash]);
    console.log('Reset Alex password');

    // 4. Delete test data
    // Delete Test Worker
    const testUser = await get("SELECT id FROM users WHERE email = 'test.worker@test.com'");
    if (testUser) {
        await run("DELETE FROM assignments WHERE user_id = ?", [testUser.id]);
        await run("DELETE FROM users WHERE id = ?", [testUser.id]);
        console.log('Deleted test worker');
    }

    // Delete Test Module
    const testModule = await get("SELECT id FROM modules WHERE title = 'Test Module'");
    if (testModule) {
        // Questions
        const questions = await all("SELECT id FROM questions WHERE module_id = ?", [testModule.id]);
        for (const q of questions) {
            await run("DELETE FROM options WHERE question_id = ?", [q.id]);
        }
        await run("DELETE FROM questions WHERE module_id = ?", [testModule.id]);
        
        // Assignments and attempts
        const assigns = await all("SELECT id FROM assignments WHERE module_id = ?", [testModule.id]);
        for (const a of assigns) {
            await run("DELETE FROM quiz_attempts WHERE assignment_id = ?", [a.id]);
            await run("DELETE FROM certificates WHERE assignment_id = ?", [a.id]);
        }
        await run("DELETE FROM assignments WHERE module_id = ?", [testModule.id]);
        
        await run("DELETE FROM modules WHERE id = ?", [testModule.id]);
        console.log('Deleted test module and associated data');
    }

    console.log('Fixes complete.');
}

doFixes().catch(console.error);
