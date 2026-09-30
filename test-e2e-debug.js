const assert = require('assert');

async function runTests() {
    try {
        let res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test.worker@test.com', password: 'password123' })
        });
        const workerCookies = res.headers.get('set-cookie');
        
        res = await fetch('http://localhost:3000/api/assignments/me', { headers: { 'Cookie': workerCookies }});
        let assignments = await res.json();
        const assignment = assignments[0];
        
        res = await fetch('http://localhost:3000/api/modules/'+assignment.module_id, { headers: { 'Cookie': workerCookies }});
        let modData = await res.json();
        
        console.log(JSON.stringify(modData.questions, null, 2));
    } catch(e) {}
}
runTests();
