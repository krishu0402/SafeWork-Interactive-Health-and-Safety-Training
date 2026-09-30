// =====================================================================
// SafeWork – Admin Dashboard JavaScript (B6)
// =====================================================================

let allUsers = [];
let allModules = [];
let adminReportsData = [];
let currentQuestionModuleId = null;
let complianceChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await API.request('/api/auth/me');
        if (user.role !== 'Administrator') {
            window.location.href = '/login.html';
            return;
        }
        document.getElementById('user-info').innerText = user.email;
        document.getElementById('sidebar-user-info').innerText = `${user.first_name} ${user.last_name}`;

        // Mobile sidebar
        const sidebar = document.getElementById('sidebar');
        document.getElementById('sidebar-open')?.addEventListener('click', () => sidebar.classList.add('open'));
        document.getElementById('sidebar-close')?.addEventListener('click', () => sidebar.classList.remove('open'));

        // Form listeners
        document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
        document.getElementById('module-form').addEventListener('submit', handleModuleSubmit);
        document.getElementById('question-form').addEventListener('submit', handleQuestionSubmit);

        await loadDashboard();
    } catch (e) {
        console.error('Init error:', e);
        window.location.href = '/login.html';
    }
});

// =====================================================================
// VIEW MANAGEMENT — single clean implementation, no duplicates
// =====================================================================
function showView(viewId, navEl) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));

    // Show target section
    const view = document.getElementById('view-' + viewId);
    if (view) view.classList.remove('hidden');

    // Update nav active state
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    else document.getElementById('nav-' + viewId)?.classList.add('active');

    document.getElementById('sidebar').classList.remove('open');

    const titles = {
        dashboard: 'System Overview', users: 'Manage Users',
        modules: 'Training Modules', questions: 'Question Management',
        reports: 'Organisation Report', certificates: 'Certificates'
    };
    const hdr = document.getElementById('page-title');
    if (hdr && titles[viewId]) hdr.innerText = titles[viewId];

    // Load data for each view
    if (viewId === 'dashboard') loadDashboard();
    else if (viewId === 'users') loadUsers();
    else if (viewId === 'modules') loadModules();
    else if (viewId === 'questions') loadQuestionModuleSelect();
    else if (viewId === 'reports') loadReports();
    else if (viewId === 'certificates') loadCertificates();
}

// =====================================================================
// DASHBOARD — real data from /api/reports/admin
// =====================================================================
async function loadDashboard() {
    try {
        const stats = await API.request('/api/reports/admin');

        document.getElementById('stat-users').innerText = stats.total_users;
        document.getElementById('stat-workers').innerText = stats.workers;
        document.getElementById('stat-supervisors').innerText = stats.supervisors;
        document.getElementById('stat-modules').innerText = stats.total_modules;
        document.getElementById('stat-certs').innerText = stats.certificates_issued;
        document.getElementById('stat-compliance').innerText = stats.compliance_pct + '%';

        // Compliance doughnut chart
        if (complianceChartInstance) complianceChartInstance.destroy();
        const ctx = document.getElementById('adminComplianceChart');
        if (ctx) {
            const notCompleted = stats.total_assignments - stats.completed;
            complianceChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Outstanding'],
                    datasets: [{
                        data: [stats.completed, notCompleted],
                        backgroundColor: ['#2ed573', '#173866'],
                        borderColor: ['#2ed573', '#0c2146'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#a9bee3', padding: 12 } }
                    }
                }
            });
        }
    } catch (e) {
        console.error('Failed to load admin dashboard:', e);
    }
}

// =====================================================================
// USER MANAGEMENT
// =====================================================================
async function loadUsers() {
    try {
        allUsers = await API.request('/api/users');
        renderUsersTable(allUsers);
    } catch (e) {
        console.error('Failed to load users:', e);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No users found.</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => {
        const lastLogin = u.last_login
            ? new Date(u.last_login).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Never';
        const roleBadgeClass = u.role === 'Administrator' ? 'badge-danger' : u.role === 'Supervisor' ? 'badge-warning' : 'badge-info';
        return `<tr>
            <td><strong>${u.first_name} ${u.last_name}</strong></td>
            <td style="font-size:0.9rem;">${u.email}</td>
            <td><span class="badge ${roleBadgeClass}">${u.role}</span></td>
            <td>${u.department || '–'}</td>
            <td>${u.is_active
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-secondary">Inactive</span>'}</td>
            <td style="font-size:0.85rem;">${lastLogin}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="showUserModal(${u.id})">Edit</button>
                <button class="btn ${u.is_active ? 'btn-warning' : 'btn-success'} btn-sm"
                        onclick="toggleUser(${u.id}, ${u.is_active})">
                    ${u.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>`;
    }).join('');
}

function filterUsers(query) {
    if (!query) { renderUsersTable(allUsers); return; }
    const q = query.toLowerCase();
    const filtered = allUsers.filter(u =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
    renderUsersTable(filtered);
}

async function showUserModal(userId) {
    document.getElementById('user-modal').classList.remove('hidden');
    document.getElementById('user-error').classList.add('hidden');
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';

    // Load departments
    try {
        const depts = await API.request('/api/users/departments');
        document.getElementById('user-dept').innerHTML = '<option value="">– Select Department –</option>' +
            depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    } catch (e) { /* non-critical */ }

    if (userId) {
        // Edit mode
        document.getElementById('user-modal-title').innerText = 'Edit User';
        document.getElementById('user-password-group').style.display = 'none';
        document.getElementById('user-password').required = false;

        const u = allUsers.find(x => x.id === userId);
        if (u) {
            document.getElementById('user-id').value = u.id;
            document.getElementById('user-fn').value = u.first_name;
            document.getElementById('user-ln').value = u.last_name;
            document.getElementById('user-email').value = u.email;
            document.getElementById('user-role').value = u.role_id;
            if (u.department_id) document.getElementById('user-dept').value = u.department_id;
        }
    } else {
        // Add mode
        document.getElementById('user-modal-title').innerText = 'Add User';
        document.getElementById('user-password-group').style.display = '';
        document.getElementById('user-password').required = true;
    }
}

async function handleUserSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('user-error');
    errorDiv.classList.add('hidden');

    const id = document.getElementById('user-id').value;
    const data = {
        first_name: document.getElementById('user-fn').value.trim(),
        last_name: document.getElementById('user-ln').value.trim(),
        email: document.getElementById('user-email').value.trim(),
        role_id: parseInt(document.getElementById('user-role').value),
        department_id: document.getElementById('user-dept').value || null,
        is_active: 1
    };
    if (!id) {
        data.password = document.getElementById('user-password').value;
    }

    try {
        if (id) {
            await API.request(`/api/users/${id}`, { method: 'PUT', body: data });
            showToast('User updated successfully');
        } else {
            await API.request('/api/users', { method: 'POST', body: data });
            showToast('User created successfully');
        }
        closeModal('user-modal');
        loadUsers();
        loadDashboard();
    } catch (err) {
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
}

async function toggleUser(userId, currentStatus) {
    if (!confirm(`${currentStatus ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
        const result = await API.request(`/api/users/${userId}/toggle`, { method: 'PUT' });
        showToast(result.message);
        loadUsers();
        loadDashboard();
    } catch (e) {
        showToast('Failed: ' + e.message, 'error');
    }
}

// =====================================================================
// MODULE MANAGEMENT
// =====================================================================
async function loadModules() {
    try {
        // Admin needs to see all modules including inactive
        allModules = await API.request('/api/modules');
        const tbody = document.getElementById('modules-table-body');

        if (allModules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No modules found.</td></tr>';
            return;
        }

        tbody.innerHTML = allModules.map(m => `<tr>
            <td>
                <strong>${m.title}</strong><br>
                <small style="color:#a9bee3;">${m.description || ''}</small>
            </td>
            <td>${m.pass_mark}%</td>
            <td>${m.duration_minutes ? m.duration_minutes + ' min' : '–'}</td>
            <td>${m.is_active
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-secondary">Archived</span>'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="showModuleModal(${m.id})">Edit</button>
                <button class="btn ${m.is_active ? 'btn-danger' : 'btn-success'} btn-sm"
                        onclick="toggleModule(${m.id}, ${m.is_active})">
                    ${m.is_active ? 'Archive' : 'Restore'}
                </button>
            </td>
        </tr>`).join('');
    } catch (e) {
        console.error('Failed to load modules:', e);
    }
}

async function showModuleModal(moduleId) {
    document.getElementById('module-modal').classList.remove('hidden');
    document.getElementById('module-error').classList.add('hidden');
    document.getElementById('module-form').reset();
    document.getElementById('mod-id').value = '';
    document.getElementById('mod-active').checked = true;

    if (moduleId) {
        document.getElementById('module-modal-title').innerText = 'Edit Module';
        const m = allModules.find(x => x.id === moduleId);
        if (m) {
            document.getElementById('mod-id').value = m.id;
            document.getElementById('mod-title').value = m.title;
            document.getElementById('mod-desc').value = m.description || '';
            document.getElementById('mod-pass').value = m.pass_mark;
            document.getElementById('mod-duration').value = m.duration_minutes || 30;
            document.getElementById('mod-active').checked = !!m.is_active;
        }
    } else {
        document.getElementById('module-modal-title').innerText = 'Create Module';
    }
}

async function handleModuleSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('module-error');
    errorDiv.classList.add('hidden');

    const id = document.getElementById('mod-id').value;
    const data = {
        title: document.getElementById('mod-title').value.trim(),
        description: document.getElementById('mod-desc').value.trim(),
        pass_mark: parseInt(document.getElementById('mod-pass').value),
        duration_minutes: parseInt(document.getElementById('mod-duration').value),
        is_active: document.getElementById('mod-active').checked ? 1 : 0
    };

    try {
        if (id) {
            await API.request(`/api/modules/${id}`, { method: 'PUT', body: data });
            showToast('Module updated successfully');
        } else {
            await API.request('/api/modules', { method: 'POST', body: data });
            showToast('Module created successfully');
        }
        closeModal('module-modal');
        loadModules();
        loadDashboard();
    } catch (e) {
        errorDiv.innerText = e.message;
        errorDiv.classList.remove('hidden');
    }
}

async function toggleModule(id, currentStatus) {
    if (!confirm(`${currentStatus ? 'Archive' : 'Restore'} this module?`)) return;
    try {
        await API.request(`/api/modules/${id}`, { method: 'DELETE' });
        showToast(`Module ${currentStatus ? 'archived' : 'restored'} successfully`);
        loadModules();
    } catch (e) {
        showToast('Failed: ' + e.message, 'error');
    }
}

// =====================================================================
// QUESTION MANAGEMENT
// =====================================================================
async function loadQuestionModuleSelect() {
    try {
        const modules = await API.request('/api/modules');
        const sel = document.getElementById('question-module-select');
        sel.innerHTML = '<option value="">-- Select a module --</option>' +
            modules.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
        document.getElementById('btn-add-question').style.display = 'none';
    } catch (e) {
        console.error(e);
    }
}

async function loadQuestionsForModule(moduleId) {
    const listEl = document.getElementById('questions-list');
    const addBtn = document.getElementById('btn-add-question');

    if (!moduleId) {
        listEl.innerHTML = '<p class="empty-state" style="padding:20px;">Select a module to view questions.</p>';
        addBtn.style.display = 'none';
        return;
    }

    currentQuestionModuleId = parseInt(moduleId);
    addBtn.style.display = '';
    listEl.innerHTML = '<p style="padding:10px; color:#a9bee3;">Loading questions...</p>';

    try {
        const questions = await API.request(`/api/questions?module_id=${moduleId}`);

        if (questions.length === 0) {
            listEl.innerHTML = '<div class="card"><p class="empty-state">No questions yet. Click "+ Add Question" to create the first one.</p></div>';
            return;
        }

        listEl.innerHTML = questions.map((q, i) => `
            <div class="card question-card mb-3" id="qcard-${q.id}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:1rem; margin-bottom:10px;">
                            ${i + 1}. ${q.question_text}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                            ${q.options.map(opt => `
                                <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:6px; background:${opt.is_correct ? 'rgba(46,213,115,0.15)' : 'rgba(0,0,0,0.1)'}; border: 1px solid ${opt.is_correct ? 'rgba(46,213,115,0.4)' : 'rgba(126,177,255,0.1)'};">
                                    <span style="color:${opt.is_correct ? '#2ed573' : '#a9bee3'}; font-size:0.85rem;">${opt.is_correct ? '✅' : '○'}</span>
                                    <span style="font-size:0.9rem; color:${opt.is_correct ? '#2ed573' : '#bfd0eb'};">${opt.option_text}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${q.explanation ? `<div style="font-size:0.85rem; color:#a9bee3; font-style:italic; padding:6px 10px; border-left:3px solid #18b8ff; background:rgba(24,184,255,0.05);">💡 ${q.explanation}</div>` : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; min-width:fit-content;">
                        <button class="btn btn-secondary btn-sm" onclick="showQuestionModal(${q.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<div class="alert alert-error">Failed to load questions: ${e.message}</div>`;
    }
}

async function showQuestionModal(questionId) {
    document.getElementById('question-modal').classList.remove('hidden');
    document.getElementById('question-error').classList.add('hidden');
    document.getElementById('question-form').reset();
    document.getElementById('q-id').value = '';

    if (questionId) {
        document.getElementById('question-modal-title').innerText = 'Edit Question';
        // Load question data
        try {
            const questions = await API.request(`/api/questions?module_id=${currentQuestionModuleId}`);
            const q = questions.find(x => x.id === questionId);
            if (q) {
                document.getElementById('q-id').value = q.id;
                document.getElementById('q-text').value = q.question_text;
                document.getElementById('q-explanation').value = q.explanation || '';
                // Render options
                document.getElementById('options-container').innerHTML = '';
                q.options.forEach(opt => addOptionRow(opt.option_text, !!opt.is_correct));
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        document.getElementById('question-modal-title').innerText = 'Add Question';
        // Default 4 option rows
        document.getElementById('options-container').innerHTML = '';
        for (let i = 0; i < 4; i++) addOptionRow();
    }
}

function addOptionRow(text = '', isCorrect = false) {
    const container = document.getElementById('options-container');
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px;';
    row.innerHTML = `
        <input type="radio" name="correct-option" ${isCorrect ? 'checked' : ''} style="width:auto; flex-shrink:0;" title="Mark as correct answer">
        <input type="text" class="option-text" value="${escQ(text)}" placeholder="Option text..." required style="flex:1;">
        <button type="button" onclick="this.parentElement.remove()" class="btn btn-danger btn-sm" title="Remove option">✕</button>
    `;
    container.appendChild(row);
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('question-error');
    errorDiv.classList.add('hidden');

    const id = document.getElementById('q-id').value;
    const questionText = document.getElementById('q-text').value.trim();
    const explanation = document.getElementById('q-explanation').value.trim();

    const optionRows = document.querySelectorAll('#options-container .option-row');
    if (optionRows.length < 2) {
        errorDiv.innerText = 'At least 2 options are required.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const options = [];
    let hasCorrect = false;
    optionRows.forEach(row => {
        const radio = row.querySelector('input[type="radio"]');
        const text = row.querySelector('.option-text').value.trim();
        if (text) {
            const isCorrect = radio && radio.checked;
            if (isCorrect) hasCorrect = true;
            options.push({ option_text: text, is_correct: isCorrect });
        }
    });

    if (!hasCorrect) {
        errorDiv.innerText = 'Please mark exactly one option as the correct answer.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const data = { module_id: currentQuestionModuleId, question_text: questionText, explanation, options };

    try {
        if (id) {
            await API.request(`/api/questions/${id}`, { method: 'PUT', body: data });
            showToast('Question updated successfully');
        } else {
            await API.request('/api/questions', { method: 'POST', body: data });
            showToast('Question added successfully');
        }
        closeModal('question-modal');
        await loadQuestionsForModule(currentQuestionModuleId);
    } catch (err) {
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
}

async function deleteQuestion(questionId) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
        await API.request(`/api/questions/${questionId}`, { method: 'DELETE' });
        showToast('Question deleted');
        await loadQuestionsForModule(currentQuestionModuleId);
    } catch (e) {
        showToast('Failed to delete question: ' + e.message, 'error');
    }
}

// =====================================================================
// REPORTS
// =====================================================================
async function loadReports() {
    try {
        const [assignments, stats] = await Promise.all([
            API.request('/api/assignments/team'),
            API.request('/api/reports/admin')
        ]);

        adminReportsData = assignments;

        document.getElementById('rep-total-workers').innerText = stats.workers;
        document.getElementById('rep-total-assign').innerText = stats.total_assignments;
        document.getElementById('rep-completed').innerText = stats.completed;
        document.getElementById('rep-overdue').innerText = stats.overdue;
        document.getElementById('rep-avgscore').innerText = stats.avg_score + '%';
        document.getElementById('rep-completion').innerText = stats.compliance_pct + '%';

        // Count In Progress
        let inProgress = 0;
        assignments.forEach(a => { if (a.status === 'In Progress') inProgress++; });
        document.getElementById('rep-inprogress').innerText = inProgress;

        const tbody = document.getElementById('admin-report-body');
        tbody.innerHTML = assignments.map(a => {
            const eff = (a.status !== 'Passed' && a.status !== 'Completed' && new Date(a.due_date) < new Date()) ? 'Overdue' : a.status;
            return `<tr>
                <td>${a.first_name} ${a.last_name}</td>
                <td style="font-size:0.9rem;">${a.email}</td>
                <td>${a.module}</td>
                <td>${getStatusBadge(eff)}</td>
                <td>${a.score !== null ? a.score + '%' : '–'}</td>
                <td>${a.attempt_count || 0}</td>
                <td>${formatDate(a.due_date)}</td>
            </tr>`;
        }).join('');

    } catch (e) {
        console.error('Failed to load admin reports:', e);
    }
}

function exportAdminReportCSV() {
    if (!adminReportsData.length) return;
    let csv = 'Worker,Email,Module,Status,Score,Attempts,Due Date\n';
    adminReportsData.forEach(a => {
        const eff = (a.status !== 'Passed' && a.status !== 'Completed' && new Date(a.due_date) < new Date()) ? 'Overdue' : a.status;
        csv += `"${a.first_name} ${a.last_name}","${a.email}","${a.module}","${eff}","${a.score !== null ? a.score + '%' : ''}","${a.attempt_count || 0}","${formatDate(a.due_date)}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Organisation_Training_Report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
}

// =====================================================================
// CERTIFICATES
// =====================================================================
async function loadCertificates() {
    try {
        const assignments = await API.request('/api/assignments/team');
        const tbody = document.getElementById('admin-certs-body');
        const passed = assignments.filter(a => a.status === 'Passed' || a.status === 'Completed');

        if (passed.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No certificates issued yet.</td></tr>';
            return;
        }

        tbody.innerHTML = passed.map(a => `<tr>
            <td>${a.first_name} ${a.last_name}</td>
            <td>${a.module}</td>
            <td>${a.score}%</td>
            <td>${formatDate(a.completed_date)}</td>
            <td><span class="badge badge-success">Issued</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="window.open('/api/assignments/${a.id}/certificate', '_blank')">View</button></td>
        </tr>`).join('');
    } catch (e) {
        console.error('Failed to load certificates:', e);
    }
}

// =====================================================================
// UTILS
// =====================================================================
function getStatusBadge(status) {
    const badges = {
        'Passed':      '<span class="badge badge-success">Passed</span>',
        'Completed':   '<span class="badge badge-success">Completed</span>',
        'Failed':      '<span class="badge badge-danger">Failed</span>',
        'Overdue':     '<span class="badge badge-danger">Overdue</span>',
        'In Progress': '<span class="badge badge-warning">In Progress</span>',
        'Not started': '<span class="badge badge-secondary">Not Started</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
}

function formatDate(d) {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('en-CA');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function escQ(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.cssText = `background:${type === 'success' ? '#2ed573' : '#ff4757'};color:${type === 'success' ? '#07152f' : '#fff'};padding:14px 22px;border-radius:8px;font-weight:bold;font-size:0.95rem;box-shadow:0 4px 15px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.3s;`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}
