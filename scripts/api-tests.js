async function runFullTests() {
    const BASE = 'http://localhost:3000';
    const results = [];
    let allPassed = true;

    function check(name, cond, detail) {
        const status = cond ? 'PASS' : 'FAIL';
        if (!cond) allPassed = false;
        results.push({ name, status, detail });
        console.log(`[${status}] ${name} ${detail ? '(' + detail + ')' : ''}`);
    }

    // 1. All Worker Logins
    const workers = [
        ['alex.k@northgate.com','AlexK_pass1'],
        ['sam.p@northgate.com','SamP_pass2'],
        ['riley.c@northgate.com','RileyC_pass3'],
        ['taylor.m@northgate.com','TaylorM_pass4'],
        ['priya.s@northgate.com','PriyaS_pass5'],
        ['chris.w@northgate.com','ChrisW_pass6']
    ];
    for (const [email, pw] of workers) {
        const r = await fetch(BASE + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password:pw}) });
        check('Worker login: ' + email, r.ok, r.status);
    }

    // 2. Supervisor login
    let r = await fetch(BASE + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'sarah.s@northgate.com', password:'SarahSup!123'}) });
    check('Supervisor login', r.ok, r.status);
    const supCookies = r.headers.get('set-cookie');

    // 3. Admin login
    r = await fetch(BASE + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'admin@northgate.com', password:'Admin@2026'}) });
    check('Admin login', r.ok, r.status);
    const adminCookies = r.headers.get('set-cookie');

    // 4. Worker login + assignments
    r = await fetch(BASE + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'alex.k@northgate.com', password:'AlexK_pass1'}) });
    const alexCookies = r.headers.get('set-cookie');
    r = await fetch(BASE + '/api/assignments/me', { headers:{'Cookie': alexCookies} });
    const assigns = await r.json();
    check('Worker assignments load', r.ok && assigns.length > 0, 'count: ' + assigns.length);

    // 5. Worker stats
    r = await fetch(BASE + '/api/assignments/me/stats', { headers:{'Cookie': alexCookies} });
    const stats = await r.json();
    check('Worker stats real data', r.ok && 'completion_pct' in stats, JSON.stringify(stats));

    // 6. Module with questions
    r = await fetch(BASE + '/api/modules/1', { headers:{'Cookie': alexCookies} });
    const mod = await r.json();
    check('Module 1 (Manual Handling) loads with questions', r.ok && mod.questions && mod.questions.length > 0, 'questions: ' + (mod.questions||[]).length);

    // 7. All 5 modules load
    for (let i=1; i<=5; i++) {
        r = await fetch(BASE + '/api/modules/' + i, { headers:{'Cookie': alexCookies} });
        const m = await r.json();
        check('Module ' + i + ' loads: ' + m.title, r.ok && m.title, m.title + ' questions: ' + (m.questions||[]).length);
    }

    // 8. Supervisor team assignments
    r = await fetch(BASE + '/api/assignments/team', { headers:{'Cookie': supCookies} });
    const teamAssigns = await r.json();
    check('Supervisor team assignments', r.ok && teamAssigns.length > 0, 'count: ' + teamAssigns.length);

    // 9. Supervisor team stats
    r = await fetch(BASE + '/api/assignments/team/stats', { headers:{'Cookie': supCookies} });
    const teamStats = await r.json();
    check('Supervisor team stats real data', r.ok && teamStats.compliance_rate !== undefined, 'compliance: ' + teamStats.compliance_rate + '%');

    // 10. Supervisor failed assessments report
    r = await fetch(BASE + '/api/reports/failed', { headers:{'Cookie': supCookies} });
    const failedRep = await r.json();
    check('Supervisor failed assessments report', r.ok, 'count: ' + failedRep.length);

    // 11. Admin stats
    r = await fetch(BASE + '/api/reports/admin', { headers:{'Cookie': adminCookies} });
    const adminStats = await r.json();
    check('Admin system stats', r.ok && adminStats.total_users > 0, 'users: ' + adminStats.total_users);

    // 12. Admin users CRUD (list)
    r = await fetch(BASE + '/api/users', { headers:{'Cookie': adminCookies} });
    const users = await r.json();
    check('Admin user list', r.ok && users.length >= 8, 'users: ' + users.length);

    // 13. Admin questions list for module 1
    r = await fetch(BASE + '/api/questions?module_id=1', { headers:{'Cookie': adminCookies} });
    const qList = await r.json();
    check('Admin questions list (Module 1)', r.ok && qList.length > 0, 'questions: ' + qList.length);

    console.log('\n--- FULL API TEST SUMMARY ---');
    console.log('Total Checks:', results.length);
    console.log('Passed:', results.filter(r => r.status === 'PASS').length);
    console.log('Failed:', results.filter(r => r.status === 'FAIL').length);
    console.log(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    process.exit(allPassed ? 0 : 1);
}

runFullTests().catch(e => { console.error(e); process.exit(1); });
