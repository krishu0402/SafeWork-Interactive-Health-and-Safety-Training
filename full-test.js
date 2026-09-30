async function runFullTests() {
    const BASE = 'http://localhost:3000';
    const results = [];
    let allPassed = true;

    function check(name, cond, detail) {
        const status = cond ? 'PASS' : 'FAIL';
        if (!cond) allPassed = false;
        results.push({ name, status, detail });
        console.log([] );
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

    // 8. Supervisor team stats
    r = await fetch(BASE + '/api/assignments/team/stats', { headers:{'Cookie': supCookies} });
    const tStats = await r.json();
    check('Supervisor team stats', r.ok && tStats.total_workers > 0, JSON.stringify(tStats));

    // 9. Supervisor training report
    r = await fetch(BASE + '/api/reports/training', { headers:{'Cookie': supCookies} });
    const trainingRep = await r.json();
    check('Training report rows', r.ok && trainingRep.length > 0, 'rows: ' + trainingRep.length);

    // 10. Riley Chen in report
    const rileyRows = trainingRep.filter(x => x.first_name === 'Riley');
    const rileyFireRow = rileyRows.find(x => x.module === 'Fire Safety');
    check('Riley Fire Safety status in training report', rileyFireRow && rileyFireRow.status === 'Passed', JSON.stringify(rileyFireRow));

    // 11. Failed assessments
    r = await fetch(BASE + '/api/reports/failed', { headers:{'Cookie': supCookies} });
    const failed = await r.json();
    check('Failed assessments API', r.ok, 'count: ' + failed.length);

    // 12. Admin reports
    r = await fetch(BASE + '/api/reports/admin', { headers:{'Cookie': adminCookies} });
    const adminStats = await r.json();
    check('Admin reports real data', r.ok && adminStats.workers > 0, JSON.stringify(adminStats));

    // 13. Admin team assignments (for report table)
    r = await fetch(BASE + '/api/assignments/team', { headers:{'Cookie': adminCookies} });
    const teamAssigns = await r.json();
    check('Admin team assignments', r.ok && teamAssigns.length > 0, 'rows: ' + teamAssigns.length);
    const rileyTeamFire = teamAssigns.find(a => a.first_name === 'Riley' && a.module === 'Fire Safety');
    check('Riley Fire Safety in admin team report', rileyTeamFire && rileyTeamFire.status === 'Passed', JSON.stringify(rileyTeamFire));

    // 14. No test users remain
    r = await fetch(BASE + '/api/users', { headers:{'Cookie': adminCookies} });
    const users = await r.json();
    const testUser = users.find(u => u.email === 'test.worker@test.com');
    check('No test users in DB', !testUser, testUser ? 'FOUND (BAD)' : 'clean');

    // 15. No test modules
    r = await fetch(BASE + '/api/modules', { headers:{'Cookie': adminCookies} });
    const modules = await r.json();
    const testMod = modules.find(m => m.title === 'Test Module');
    check('No test modules in DB', !testMod, testMod ? 'FOUND (BAD)' : 'clean');
    check('Exactly 5 modules', modules.length === 5, 'count: ' + modules.length);
    const mvEquip = modules.find(m => m.title === 'Moving Vehicles & Equipment');
    check('Module name consistent: Moving Vehicles & Equipment', !!mvEquip, mvEquip ? 'OK' : 'NOT FOUND');

    // 16. Certificate HTML for Alex's passed assignment
    const passed = teamAssigns.find(a => a.first_name === 'Alex' && a.status === 'Passed');
    if (passed) {
        r = await fetch(BASE + '/api/assignments/' + passed.id + '/certificate', { headers:{'Cookie': adminCookies} });
        const certHtml = await r.text();
        check('Certificate generates HTML', r.ok && certHtml.includes('SafeWork'), 'len: ' + certHtml.length);
        check('Certificate no SAMPLE watermark', !certHtml.toLowerCase().includes('sample'), '');
        check('Certificate has worker name', certHtml.includes('Alex'), '');
    }

    // 17. SafeTech pages load
    for (const page of ['', 'about.html', 'services.html', 'safework.html', 'how-it-works.html', 'portfolio.html', 'contact.html']) {
        r = await fetch(BASE + '/safetech/' + page);
        check('SafeTech page: /' + (page||'index.html'), r.ok, r.status);
    }

    // 18. Role-based access (worker cannot access team reports)
    r = await fetch(BASE + '/api/reports/training', { headers:{'Cookie': alexCookies} });
    check('Role restriction: worker cannot access /api/reports/training', r.status === 403 || r.status === 401, 'status: ' + r.status);

    console.log('');
    console.log(allPassed ? '? ALL TESTS PASSED' : '? SOME TESTS FAILED');
    console.log('Total:', results.length, '| Passed:', results.filter(r=>r.status==='PASS').length, '| Failed:', results.filter(r=>r.status==='FAIL').length);
}
runFullTests().catch(console.error);
