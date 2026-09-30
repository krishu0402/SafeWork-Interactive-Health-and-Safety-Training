const { db, run, get, all } = require('./src/config/database');
async function doDelete() {
    const testUser = await get("SELECT id FROM users WHERE email = 'test.worker@test.com'");
    if (testUser) {
        const assigns = await all("SELECT id FROM assignments WHERE user_id = ?", [testUser.id]);
        for (const a of assigns) {
            await run("DELETE FROM quiz_attempts WHERE assignment_id = ?", [a.id]);
            await run("DELETE FROM certificates WHERE assignment_id = ?", [a.id]);
        }
        await run("DELETE FROM assignments WHERE user_id = ?", [testUser.id]);
        await run("DELETE FROM users WHERE id = ?", [testUser.id]);
        console.log('Deleted test worker');
    }
    
    // Now delete Test Module just in case it didn't finish
    const testModule = await get("SELECT id FROM modules WHERE title = 'Test Module'");
    if (testModule) {
        const questions = await all("SELECT id FROM questions WHERE module_id = ?", [testModule.id]);
        for (const q of questions) {
            await run("DELETE FROM options WHERE question_id = ?", [q.id]);
        }
        await run("DELETE FROM questions WHERE module_id = ?", [testModule.id]);
        
        const assigns = await all("SELECT id FROM assignments WHERE module_id = ?", [testModule.id]);
        for (const a of assigns) {
            await run("DELETE FROM quiz_attempts WHERE assignment_id = ?", [a.id]);
            await run("DELETE FROM certificates WHERE assignment_id = ?", [a.id]);
        }
        await run("DELETE FROM assignments WHERE module_id = ?", [testModule.id]);
        await run("DELETE FROM modules WHERE id = ?", [testModule.id]);
        console.log('Deleted test module');
    }
}
doDelete().catch(console.error);
