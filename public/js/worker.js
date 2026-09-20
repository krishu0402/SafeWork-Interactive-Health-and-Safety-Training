document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await API.request('/api/auth/me');
        if (user.role !== 'Worker') {
            window.location.href = '/login.html';
        }

        document.getElementById('welcome-message').innerText = `Welcome, ${user.first_name}`;
        document.getElementById('user-info').innerText = user.email;

        // Navigation
        document.getElementById('nav-dashboard').addEventListener('click', showDashboard);
        document.getElementById('nav-training').addEventListener('click', showTraining);
        document.getElementById('nav-certificates').addEventListener('click', showCertificates);
        document.getElementById('nav-history').addEventListener('click', showHistory);
        document.getElementById('nav-profile').addEventListener('click', showProfile);

        await loadAssignments();
    } catch (e) {
        console.error(e);
    }
});

function getStatusBadge(status) {
    switch(status) {
        case 'Passed': return '<span class="badge badge-success">Passed</span>';
        case 'Completed': return '<span class="badge badge-success">Completed</span>';
        case 'Failed': return '<span class="badge badge-danger">Failed</span>';
        case 'Overdue': return '<span class="badge badge-danger">Overdue</span>';
        case 'In progress': return '<span class="badge badge-warning">In progress</span>';
        default: return '<span class="badge badge-secondary">Not started</span>';
    }
}

async function loadAssignments() {
    try {
        const assignments = await API.request('/api/assignments/me');
        const tbody = document.getElementById('assignments-table-body');
        if (tbody) tbody.innerHTML = '';

        let completed = 0;
        let outstanding = 0;
        let overdue = 0;

        const gridContainer = document.getElementById('course-grid-container');
        const certList = document.getElementById('certifications-list');
        if (gridContainer) gridContainer.innerHTML = '';
        if (certList) certList.innerHTML = '';

        assignments.forEach(a => {
            if (a.status === 'Passed' || a.status === 'Completed') completed++;
            else outstanding++;

            if (new Date(a.due_date) < new Date() && a.status !== 'Passed') {
                a.status = 'Overdue';
                overdue++;
            }
            
            // Build Certification Row if passed
            if (a.status === 'Passed' && certList) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span style="background: #2ed573; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Valid</span></td>
                    <td style="cursor: pointer; color: #18b8ff;" onclick="viewCertificate(${a.id})">${a.title} ⓘ</td>
                `;
                certList.appendChild(tr);
            }

            // Build Course Card
            if (gridContainer) {
                let actionBtn = `<button class="btn btn-primary" style="width: 100%; padding: 8px;" onclick="startModule(${a.module_id}, ${a.id})">START COURSE</button>`;
                if (a.status === 'Passed') {
                    actionBtn = `<button class="btn btn-success" style="width: 100%; padding: 8px;" onclick="viewCertificate(${a.id})">VIEW CERTIFICATE</button>`;
                } else if (a.status === 'Failed') {
                    actionBtn = `<button class="btn btn-warning" style="width: 100%; padding: 8px;" onclick="startModule(${a.module_id}, ${a.id})">RETRY COURSE</button>`;
                }

                const card = document.createElement('div');
                card.className = 'course-card';
                card.innerHTML = `
                    <div class="course-img">
                        <span class="course-badge">ONLINE</span>
                    </div>
                    <div class="course-info">
                        <div class="course-title">${a.title}</div>
                        <div class="course-desc">${a.description}</div>
                        <div style="font-size: 0.8rem; margin-bottom: 10px;">${getStatusBadge(a.status)} • Due: ${new Date(a.due_date).toLocaleDateString()}</div>
                        ${a.score !== null ? `<div style="font-size: 0.8rem; margin-bottom: 10px;">Score: ${a.score}%</div>` : ''}
                    </div>
                    <div class="course-footer">
                        ${actionBtn}
                    </div>
                `;
                gridContainer.appendChild(card);
            }
        });

        const total = assignments.length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        document.getElementById('stat-progress').innerText = `${progress}%`;
        document.getElementById('stat-completed').innerText = completed;
        document.getElementById('stat-outstanding').innerText = outstanding;
        document.getElementById('stat-overdue').innerText = overdue;

    } catch (e) {
        console.error('Failed to load assignments', e);
    }
}

async function startModule(moduleId, assignmentId) {
    hideAllViews();
    document.getElementById('view-scenario').classList.remove('hidden');
    
    // Reset scenario state
    document.getElementById('scenario-feedback').classList.add('hidden');
    document.getElementById('scenario-feedback').className = 'alert hidden mb-3';
    document.getElementById('btn-proceed-quiz').style.display = 'none';
    
    // Store module info for quiz later
    window.currentModuleId = moduleId;
    window.currentAssignmentId = assignmentId;
    
    const container = document.getElementById('quiz-container');
    container.innerHTML = '<p>Loading quiz...</p>';

    try {
        window.currentModData = await API.request(`/api/modules/${moduleId}`);
    } catch (e) {
        container.innerHTML = `<div class="alert alert-error">Error loading module: ${e.message}</div>
                               <button class="btn btn-secondary" onclick="showDashboard()">Back</button>`;
    }
}

function identifyHazard(id, description) {
    const feedback = document.getElementById('scenario-feedback');
    feedback.classList.remove('hidden', 'alert-error', 'alert-success', 'alert-warning');
    
    // Just a mock interaction for A1/A2 requirement
    feedback.classList.add('alert-success');
    feedback.innerHTML = `<strong>Hazard Identified:</strong> ${description}. Good job!`;
    
    // Show proceed button
    document.getElementById('btn-proceed-quiz').style.display = 'inline-block';
    document.getElementById('btn-proceed-quiz').onclick = () => showQuizView();
}

function showQuizView() {
    document.getElementById('view-scenario').classList.add('hidden');
    document.getElementById('view-quiz').classList.remove('hidden');
    
    const mod = window.currentModData;
    const container = document.getElementById('quiz-container');
    
    // Render scenario/quiz
    let html = `<h2>${mod.title}</h2><p>${mod.description}</p>`;
    
    html += `<div class="mt-3"><form id="quiz-form">`;
    mod.questions.forEach((q, index) => {
        html += `<div class="form-group mt-3">
                    <label><strong>${index + 1}. ${q.question_text}</strong></label>
                    <div>`;
        q.options.forEach(opt => {
            html += `<div>
                        <input type="radio" id="opt_${opt.id}" name="q_${q.id}" value="${opt.id}" required>
                        <label style="display:inline; font-weight:normal;" for="opt_${opt.id}">${opt.option_text}</label>
                     </div>`;
        });
        html += `</div></div>`;
    });
    
    html += `<button type="submit" class="btn btn-primary mt-3">Submit Quiz</button>
             <button type="button" class="btn btn-secondary mt-3" onclick="showDashboard()">Cancel</button>
             </form></div>`;
    
    container.innerHTML = html;

    document.getElementById('quiz-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const answers = {};
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('q_')) {
                answers[key.split('_')[1]] = value;
            }
        }
        
        try {
            const res = await API.request(`/api/assignments/${window.currentAssignmentId}/submit`, {
                method: 'POST',
                body: { answers }
            });
            
            showQuizResult(res);
        } catch (err) {
            alert('Error submitting quiz: ' + err.message);
        }
    });
}

function showQuizResult(res) {
    document.getElementById('view-quiz').classList.add('hidden');
    document.getElementById('view-result').classList.remove('hidden');
    
    const resultContainer = document.getElementById('result-container');
    const isPass = res.passed;
    
    resultContainer.innerHTML = `
        <h2 class="${isPass ? 'text-success' : 'text-error'}" style="font-size: 2rem;">${isPass ? 'Congratulations! You Passed!' : 'Training Failed.'}</h2>
        <p style="font-size: 1.5rem; margin: 20px 0;">Your Score: <strong>${res.score}%</strong></p>
        <p style="font-size: 1.2rem;">Pass Mark Required: ${res.pass_mark}%</p>
        
        <div class="mt-3">
            <button class="btn btn-primary" style="font-size: 1.2rem; padding: 10px 20px;" onclick="showDashboard()">Back to Dashboard</button>
            ${isPass ? `<button class="btn btn-success" style="font-size: 1.2rem; padding: 10px 20px;" onclick="viewCertificate(${window.currentAssignmentId})">View Certificate</button>` : `<button class="btn btn-warning" style="font-size: 1.2rem; padding: 10px 20px;" onclick="startModule(window.currentModuleId, window.currentAssignmentId)">Retry Module</button>`}
        </div>
    `;
}

function hideAllViews() {
    document.getElementById('view-scenario').classList.add('hidden');
    document.getElementById('view-quiz').classList.add('hidden');
    document.getElementById('view-result').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    if(document.getElementById('view-training')) document.getElementById('view-training').classList.add('hidden');
    if(document.getElementById('view-certificates')) document.getElementById('view-certificates').classList.add('hidden');
    if(document.getElementById('view-certificate-display')) document.getElementById('view-certificate-display').classList.add('hidden');
    if(document.getElementById('view-history')) document.getElementById('view-history').classList.add('hidden');
    if(document.getElementById('view-profile')) document.getElementById('view-profile').classList.add('hidden');
    
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
}

function showDashboard() {
    hideAllViews();
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    loadAssignments();
}

function showTraining() {
    hideAllViews();
    document.getElementById('view-training').classList.remove('hidden');
    document.getElementById('nav-training').classList.add('active');
    loadAssignments();
}

async function showCertificates() {
    hideAllViews();
    document.getElementById('view-certificates').classList.remove('hidden');
    document.getElementById('nav-certificates').classList.add('active');
    
    try {
        const assignments = await API.request('/api/assignments/me');
        const tbody = document.getElementById('certificates-table-body');
        tbody.innerHTML = '';
        
        let passed = 0;
        let failed = 0;
        let bestModule = { score: -1, title: '-' };
        let worstModule = { score: 101, title: '-' };

        assignments.forEach(a => {
            if (a.status === 'Passed' || a.status === 'Completed') {
                passed++;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${a.title}</strong></td>
                    <td>${new Date(a.completed_date).toLocaleDateString()}</td>
                    <td>${a.score}%</td>
                    <td><button class="btn btn-success btn-sm" onclick="viewCertificate(${a.id})">View Certificate</button></td>
                `;
                tbody.appendChild(tr);
            } else if (a.status === 'Failed') {
                failed++;
            }
            
            if (a.score !== null) {
                if (a.score > bestModule.score) bestModule = { score: a.score, title: a.title };
                if (a.score < worstModule.score) worstModule = { score: a.score, title: a.title };
            }
        });

        document.getElementById('perf-passed').innerText = passed;
        document.getElementById('perf-failed').innerText = failed;
        document.getElementById('perf-best').innerText = bestModule.score >= 0 ? `${bestModule.title} (${bestModule.score}%)` : '-';
        document.getElementById('perf-worst').innerText = worstModule.score <= 100 ? `${worstModule.title} (${worstModule.score}%)` : '-';

    } catch (e) {
        console.error('Failed to load certificates', e);
    }
}

async function downloadMarksCSV() {
    try {
        const assignments = await API.request('/api/assignments/me');
        let csv = 'Module,Status,Due Date,Date Passed,Score\n';
        assignments.forEach(a => {
            const d1 = new Date(a.completed_date);
            const passedDate = a.completed_date ? d1.getDate().toString().padStart(2, '0') + '/' + (d1.getMonth() + 1).toString().padStart(2, '0') + '/' + d1.getFullYear() : '-';
            const d2 = new Date(a.due_date);
            const dueDate = a.due_date ? d2.getDate().toString().padStart(2, '0') + '/' + (d2.getMonth() + 1).toString().padStart(2, '0') + '/' + d2.getFullYear() : '-';
            csv += `"${a.title}","${a.status}","=""${dueDate}""","=""${passedDate}""","${a.score || 0}%"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'My_Training_Marks.csv';
        a.click();
    } catch (e) {
        alert('Failed to download marks.');
    }
}

function viewCertificate(assignmentId) {
    window.open(`/api/assignments/${assignmentId}/certificate`, '_blank');
}


async function showHistory() {
    hideAllViews();
    document.getElementById('view-history').classList.remove('hidden');
    document.getElementById('nav-history').classList.add('active');
    
    try {
        const assignments = await API.request('/api/assignments/me');
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';
        
        assignments.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.title}</strong></td>
                <td>${a.status}</td>
                <td>${a.score !== null ? a.score + '%' : '-'}</td>
                <td>${a.completed_date ? new Date(a.completed_date).toLocaleDateString() : '-'}</td>
                <td>${a.attempt_count}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Failed to load history', e);
    }
}

async function showProfile() {
    hideAllViews();
    document.getElementById('view-profile').classList.remove('hidden');
    document.getElementById('nav-profile').classList.add('active');
    
    try {
        const user = await API.request('/api/auth/me');
        document.getElementById('profile-name').innerText = `${user.first_name} ${user.last_name}`;
        document.getElementById('profile-email').innerText = user.email;
    } catch (e) {
        console.error('Failed to load profile', e);
    }
}

