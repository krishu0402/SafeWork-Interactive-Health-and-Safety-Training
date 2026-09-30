const assert = require('assert');

async function runTests() {
    console.log('Starting E2E API tests...');
    try {
        // 1. Admin Login
        let res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@northgate.com', password: 'Admin@2026' })
        });
        assert(res.ok, 'Admin login failed');
        const adminCookies = res.headers.get('set-cookie');
        
        // 2. Module CRUD (Admin)
        res = await fetch('http://localhost:3000/api/modules', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
            body: JSON.stringify({ title: 'Test Module', description: 'Testing CRUD', pass_mark: 80, duration_minutes: 20, is_active: 1 })
        });
        assert(res.ok, 'Module create failed');
        let data = await res.json();
        const newModuleId = data.id || data.module_id || data.lastID;
        
        // 3. Question CRUD (Admin)
        res = await fetch('http://localhost:3000/api/questions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
            body: JSON.stringify({
                module_id: newModuleId,
                question_text: 'Test question?',
                explanation: 'Test explanation',
                options: [
                    { option_text: 'Wrong', is_correct: false },
                    { option_text: 'Right', is_correct: true }
                ]
            })
        });
        assert(res.ok, 'Question create failed');
        data = await res.json();
        
        // 4. Employee Management (Admin)
        res = await fetch('http://localhost:3000/api/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': adminCookies },
            body: JSON.stringify({
                first_name: 'Test', last_name: 'Worker', email: 'test.worker@test.com',
                password: 'password123', role_id: 1, is_active: 1
            })
        });
        assert(res.ok, 'User create failed');
        data = await res.json();
        const newWorkerId = data.id || data.user_id || data.lastID;

        // 5. Supervisor Login
        res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'sarah.s@northgate.com', password: 'SarahSup!123' })
        });
        assert(res.ok, 'Supervisor login failed');
        const supCookies = res.headers.get('set-cookie');

        // 6. Assign Training (Supervisor)
        // Need to find an assignment endpoint
        res = await fetch('http://localhost:3000/api/assignments', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': supCookies },
            body: JSON.stringify({ user_id: newWorkerId, module_id: newModuleId, due_date: '2026-12-31' })
        });
        assert(res.ok, 'Assign training failed');
        
        // 7. Worker Login
        res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test.worker@test.com', password: 'password123' })
        });
        assert(res.ok, 'Worker login failed');
        const workerCookies = res.headers.get('set-cookie');

        // 8. Fetch Worker Assignments
        res = await fetch('http://localhost:3000/api/assignments/me', {
            headers: { 'Cookie': workerCookies }
        });
        assert(res.ok, 'Fetch worker assignments failed');
        let assignments = await res.json();
        const assignment = assignments.find(a => a.module_id === newModuleId);
        assert(assignment, 'New assignment not found');
        const assignmentId = assignment.id;
        
        // 9. Start Training (Worker)
        res = await fetch('http://localhost:3000/api/assignments/'+assignmentId+'/start', {
            method: 'PUT', headers: { 'Cookie': workerCookies }
        });
        assert(res.ok, 'Start training failed');
        
        // 10. Fetch Quiz Questions (Worker)
        res = await fetch('http://localhost:3000/api/modules/'+newModuleId, {
            headers: { 'Cookie': workerCookies }
        });
        assert(res.ok, 'Fetch module questions failed');
        let modData = await res.json();
        const qId = modData.questions[0].id;
        const correctOptId = modData.questions[0].options.find(o => o.option_text === 'Right').id;
        
        // 11. Submit Quiz (Worker)
        let answers = {};
        answers[qId] = correctOptId;
        res = await fetch('http://localhost:3000/api/assignments/'+assignmentId+'/submit', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': workerCookies },
            body: JSON.stringify({ answers: answers })
        });
        assert(res.ok, 'Submit quiz failed');
        let resultData = await res.json();
        assert(resultData.passed === true, 'Quiz should have passed');
        
        console.log('All E2E API tests passed!');
        
    } catch (e) {
        console.error('Test failed:', e);
    }
}
runTests();
