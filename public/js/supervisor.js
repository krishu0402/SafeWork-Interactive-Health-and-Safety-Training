// =====================================================================
// SafeWork – Supervisor Dashboard JavaScript (B6)
// =====================================================================

let allTeamReports = [];
let allWorkers = [];
let moduleChartInstance = null;
let statusChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await API.request('/api/auth/me');
        if (user.role !== 'Supervisor') {
            window.location.href = '/login.html';
            return;
        }
        document.getElementById('user-info').innerText = user.email;
        document.getElementById('welcome-message').innerText = `Welcome, ${user.first_name}`;
        document.getElementById('sidebar-user-info').innerText = `${user.first_name} ${user.last_name}`;

        // Dynamic date
        const dateEl = document.getElementById('topbar-date');
        if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        // Mobile sidebar
        const sidebar = document.getElementById('sidebar');
        document.getElementById('sidebar-open')?.addEventListener('click', () => sidebar.classList.add('open'));
        document.getElementById('sidebar-close')?.addEventListener('click', () => sidebar.classList.remove('open'));

        // Form listeners
        document.getElementById('assign-form').addEventListener('submit', handleAssignSubmit);
        document.getElementById('worker-form').addEventListener('submit', handleWorkerSubmit);

        await loadDashboard();
    } catch (e) {
        console.error('Init error:', e);
        window.location.href = '/login.html';
    }
});

// =====================================================================
// VIEW MANAGEMENT
// =====================================================================
function showView(viewId, navEl) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    const view = document.getElementById('view-' + viewId);
    if (view) view.classList.remove('hidden');

    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    else document.getElementById('nav-' + viewId)?.classList.add('active');

    document.getElementById('sidebar').classList.remove('open');

    const titleMap = {
        dashboard: 'Team Dashboard',
        employees: 'Employees',
        failed: 'Failed Assessments',
        reports: 'Training Reports'
    };
    const hdr = document.getElementById('welcome-message');
    if (hdr && titleMap[viewId]) hdr.innerText = titleMap[viewId];

    if (viewId === 'dashboard') loadDashboard();
    else if (viewId === 'employees') loadEmployees();
    else if (viewId === 'failed') loadFailed();
    else if (viewId === 'reports') loadReports();
}

// =====================================================================
// STATUS HELPERS
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

function isPastDue(dueDate) {
    if (!dueDate) return false;
    const dateStr = String(dueDate).split('T')[0];
    const due = new Date(`${dateStr}T23:59:59`);
    return due < new Date();
}

function getEffectiveStatus(r) {
    if ((r.status !== 'Passed' && r.status !== 'Completed') && isPastDue(r.due_date)) return 'Overdue';
    return r.status;
}

// =====================================================================
// DASHBOARD
// =====================================================================
async function loadDashboard() {
    try {
        const [stats, reports] = await Promise.all([
            API.request('/api/assignments/team/stats'),
            API.request('/api/reports/training')
        ]);

        allTeamReports = reports;

        // Stat cards — all from real DB
        document.getElementById('stat-team').innerText = stats.total_workers;
        document.getElementById('stat-completed').innerText = stats.completed;
        document.getElementById('stat-inprogress').innerText = stats.in_progress;
        document.getElementById('stat-overdue').innerText = stats.overdue;
        document.getElementById('stat-rate').innerText = stats.compliance_rate + '%';
        document.getElementById('stat-failed').innerText = stats.failed;

        // Recent activity table
        const tbody = document.getElementById('activity-table-body');
        const recentItems = [...reports]
            .sort((a, b) => new Date(b.completed_date || 0) - new Date(a.completed_date || 0))
            .slice(0, 10);

        if (recentItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No team activity yet.</td></tr>';
        } else {
            tbody.innerHTML = recentItems.map(r => {
                const eff = getEffectiveStatus(r);
                return `<tr>
                    <td>${r.first_name} ${r.last_name}</td>
                    <td>${r.module}</td>
                    <td>${getStatusBadge(eff)}</td>
                    <td>${r.score !== null ? r.score + '%' : '–'}</td>
                    <td>${formatDate(r.due_date)}</td>
                </tr>`;
            }).join('');
        }

        // Module completion chart — real data
        const moduleLabels = Object.keys(stats.module_stats);
        const moduleData = Object.values(stats.module_stats);

        if (moduleChartInstance) moduleChartInstance.destroy();
        const moduleCtx = document.getElementById('moduleChart');
        if (moduleCtx) {
            moduleChartInstance = new Chart(moduleCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: moduleLabels,
                    datasets: [{
                        label: 'Completion %',
                        data: moduleData,
                        backgroundColor: moduleData.map(v => v >= 70 ? '#2ed573' : v >= 40 ? '#ffb142' : '#ff4757'),
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            min: 0, max: 100,
                            ticks: { color: '#a9bee3', callback: v => v + '%' },
                            grid: { color: 'rgba(126,177,255,0.1)' }
                        },
                        y: { ticks: { color: '#a9bee3' }, grid: { display: false } }
                    }
                }
            });
        }

        // Status breakdown chart — real data
        const statusCounts = { Passed: stats.completed, 'In Progress': stats.in_progress, Failed: stats.failed, Overdue: stats.overdue };
        if (statusChartInstance) statusChartInstance.destroy();
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            statusChartInstance = new Chart(statusCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: ['#2ed573', '#ffb142', '#ff4757', '#ff6b6b'],
                        borderWidth: 2,
                        borderColor: '#0c2146'
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
        console.error('Failed to load dashboard:', e);
    }
}

// =====================================================================
// EMPLOYEES
// =====================================================================
async function loadEmployees() {
    try {
        const [team, reports] = await Promise.all([
            API.request('/api/users'),
            API.request('/api/reports/training')
        ]);

        allWorkers = team.filter(u => u.role === 'Worker');

        // Build per-worker stats
        const workerStats = {};
        allWorkers.forEach(w => {
            workerStats[w.id] = { completed: 0, overdue: 0, total: 0 };
        });

        reports.forEach(r => {
            const worker = allWorkers.find(w => w.email === r.email);
            if (!worker) return;
            workerStats[worker.id].total++;
            const eff = getEffectiveStatus(r);
            if (eff === 'Passed' || eff === 'Completed') workerStats[worker.id].completed++;
            if (eff === 'Overdue') workerStats[worker.id].overdue++;
        });

        renderEmployeesTable(allWorkers, workerStats);
    } catch (e) {
        console.error('Failed to load employees:', e);
    }
}

function renderEmployeesTable(workers, stats) {
    const tbody = document.getElementById('workers-table-body');
    if (workers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No workers found.</td></tr>';
        return;
    }
    tbody.innerHTML = workers.map(w => {
        const ws = stats ? (stats[w.id] || { completed: 0, overdue: 0, total: 0 }) : { completed: 0, overdue: 0, total: 0 };
        const statusBadge = ws.overdue > 0
            ? '<span class="badge badge-danger">Overdue</span>'
            : ws.completed === ws.total && ws.total > 0
                ? '<span class="badge badge-success">Compliant</span>'
                : '<span class="badge badge-warning">In Progress</span>';
        return `<tr>
            <td><strong>${w.first_name} ${w.last_name}</strong></td>
            <td>${w.email}</td>
            <td>${w.department || '–'}</td>
            <td>${ws.completed} / ${ws.total}</td>
            <td>${ws.overdue > 0 ? `<span style="color:#e74c3c; font-weight:bold;">${ws.overdue}</span>` : '–'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editWorker(${w.id}, '${escQ(w.first_name)}', '${escQ(w.last_name)}', '${escQ(w.email)}')">Edit</button>
            </td>
        </tr>`;
    }).join('');
}

function filterEmployees(query) {
    if (!query) { renderEmployeesTable(allWorkers, {}); return; }
    const q = query.toLowerCase();
    const filtered = allWorkers.filter(w =>
        `${w.first_name} ${w.last_name}`.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q)
    );
    renderEmployeesTable(filtered, {});
}

// =====================================================================
// FAILED ASSESSMENTS
// =====================================================================
async function loadFailed() {
    try {
        const failed = await API.request('/api/reports/failed');
        const tbody = document.getElementById('failed-table-body');

        if (failed.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No failed assessments. Great news!</td></tr>';
            return;
        }
        tbody.innerHTML = failed.map(f => `<tr>
            <td><strong>${f.first_name} ${f.last_name}</strong></td>
            <td>${f.email}</td>
            <td>${f.department || '–'}</td>
            <td>${f.module}</td>
            <td style="color:#e74c3c;">${f.score !== null ? f.score + '%' : '–'}</td>
            <td>${f.attempt_count}</td>
            <td>${formatDate(f.due_date)}</td>
        </tr>`).join('');
    } catch (e) {
        console.error('Failed to load failed assessments:', e);
    }
}

// =====================================================================
// REPORTS
// =====================================================================
async function loadReports() {
    try {
        allTeamReports = await API.request('/api/reports/training');
        applyReportFilter();
    } catch (e) {
        console.error('Failed to load reports:', e);
    }
}

function applyReportFilter() {
    const filterVal = document.getElementById('report-filter-status')?.value || 'all';
    const tbody = document.getElementById('reports-table-body');

    let data = allTeamReports.map(r => ({ ...r, effective_status: getEffectiveStatus(r) }));

    if (filterVal !== 'all') {
        if (filterVal === 'Overdue') {
            data = data.filter(r => r.effective_status === 'Overdue');
        } else {
            data = data.filter(r => r.status === filterVal);
        }
    }

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No records match this filter.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(r => `<tr>
        <td>${r.first_name} ${r.last_name}</td>
        <td>${r.department || '–'}</td>
        <td>${r.module}</td>
        <td>${getStatusBadge(r.effective_status)}</td>
        <td>${r.score !== null ? r.score + '%' : '–'}</td>
        <td>${r.attempt_count || 0}</td>
        <td>${formatDate(r.due_date)}</td>
        <td>${formatDate(r.completed_date)}</td>
    </tr>`).join('');
}

// =====================================================================
// ASSIGN TRAINING
// =====================================================================
async function showAssignModal() {
    document.getElementById('assign-modal').classList.remove('hidden');
    document.getElementById('assign-error').classList.add('hidden');
    document.getElementById('assign-form').reset();

    try {
        const [team, modules] = await Promise.all([
            API.request('/api/users'),
            API.request('/api/modules')
        ]);

        const workers = team.filter(u => u.role === 'Worker' && u.is_active);
        document.getElementById('assign-user').innerHTML = workers.map(w =>
            `<option value="${w.id}">${w.first_name} ${w.last_name}</option>`
        ).join('');
        document.getElementById('assign-module').innerHTML = modules.map(m =>
            `<option value="${m.id}">${m.title}</option>`
        ).join('');

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('assign-date').min = today;
    } catch (e) {
        console.error('Error loading assign modal data:', e);
    }
}

async function handleAssignSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('assign-error');
    errorDiv.classList.add('hidden');

    const data = {
        user_id: document.getElementById('assign-user').value,
        module_id: document.getElementById('assign-module').value,
        due_date: document.getElementById('assign-date').value
    };

    try {
        await API.request('/api/assignments', { method: 'POST', body: data });
        closeModal('assign-modal');
        showToast('Training assigned successfully', 'success');
        await loadDashboard();
    } catch (err) {
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
}

// =====================================================================
// WORKER MANAGEMENT
// =====================================================================
function showWorkerModal() {
    document.getElementById('worker-modal-title').innerText = 'Add Worker';
    document.getElementById('worker-form').reset();
    document.getElementById('worker-id').value = '';
    document.getElementById('worker-password-group').style.display = '';
    document.getElementById('worker-password').required = true;
    document.getElementById('worker-error').classList.add('hidden');
    document.getElementById('worker-modal').classList.remove('hidden');
}

function editWorker(id, fn, ln, email) {
    document.getElementById('worker-modal-title').innerText = 'Edit Worker';
    document.getElementById('worker-form').reset();
    document.getElementById('worker-id').value = id;
    document.getElementById('worker-fn').value = fn;
    document.getElementById('worker-ln').value = ln;
    document.getElementById('worker-email').value = email;
    document.getElementById('worker-password-group').style.display = 'none';
    document.getElementById('worker-password').required = false;
    document.getElementById('worker-error').classList.add('hidden');
    document.getElementById('worker-modal').classList.remove('hidden');
}

async function handleWorkerSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('worker-error');
    errorDiv.classList.add('hidden');

    const id = document.getElementById('worker-id').value;
    const data = {
        first_name: document.getElementById('worker-fn').value.trim(),
        last_name: document.getElementById('worker-ln').value.trim(),
        email: document.getElementById('worker-email').value.trim(),
        role_id: 1,
        department_id: 1,
        shift_id: 1,
        is_active: 1
    };

    if (!id) {
        data.password = document.getElementById('worker-password').value;
    }

    try {
        if (id) {
            await API.request(`/api/users/${id}`, { method: 'PUT', body: data });
            showToast('Worker updated successfully', 'success');
        } else {
            await API.request('/api/users', { method: 'POST', body: data });
            showToast('Worker added successfully', 'success');
        }
        closeModal('worker-modal');
        loadEmployees();
    } catch (err) {
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
}

function csvValue(value) {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) {
        text = "'" + text;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

// =====================================================================
// CSV EXPORT
// =====================================================================
function exportCSV() {
    const filterVal = document.getElementById('report-filter-status')?.value || 'all';
    let data = allTeamReports.map(r => ({ ...r, effective_status: getEffectiveStatus(r) }));
    if (filterVal !== 'all') {
        data = data.filter(r => r.effective_status === filterVal || r.status === filterVal);
    }

    let csv = 'Employee,Department,Module,Status,Score,Attempts,Due Date,Completed\n';
    data.forEach(r => {
        csv += `${csvValue(r.first_name + ' ' + r.last_name)},${csvValue(r.department || '')},${csvValue(r.module)},${csvValue(r.effective_status)},${csvValue(r.score !== null ? r.score + '%' : '')},${csvValue(r.attempt_count || 0)},${csvValue(formatDate(r.due_date))},${csvValue(formatDate(r.completed_date))}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SafeWork_Team_Report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// =====================================================================
// UTILS
// =====================================================================
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function escQ(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `background:${type === 'success' ? '#2ed573' : '#ff4757'};color:#07152f;padding:14px 22px;border-radius:8px;font-weight:bold;font-size:0.95rem;box-shadow:0 4px 15px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.3s;`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
