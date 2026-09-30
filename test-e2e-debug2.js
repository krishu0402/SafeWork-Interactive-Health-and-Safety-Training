const assert = require('assert');
async function runTests() {
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
    const qId = modData.questions[0].id;
    const correctOptId = modData.questions[0].options[1].id;
    
    let answers = {};
    answers[qId] = correctOptId;
    res = await fetch('http://localhost:3000/api/assignments/'+assignment.id+'/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': workerCookies },
        body: JSON.stringify({ answers: answers })
    });
    let resultData = await res.json();
    console.log(JSON.stringify(resultData, null, 2));
}
runTests();
