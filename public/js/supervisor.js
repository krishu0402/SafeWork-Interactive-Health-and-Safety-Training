document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await API.request('/api/auth/me');
        if (user.role !== 'Supervisor') {
            window.location.href = '/login.html';
        }
        document.getElementById('user-info').innerText = user.email;
        loadDashboard();
    } catch (e) {
        console.error(e);
    }
});

function showView(viewId) {
    document.querySelectorAll('.content-area').forEach(el => el.classList.add('hidden'));
    const view = document.getElementById('view-' + viewId);
    if(view) view.classList.remove('hidden');
    
    if(viewId === 'dashboard') loadDashboard();
    if(viewId === 'workers') loadWorkers();
    if(viewId === 'reports') loadReports();
}

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

async function loadDashboard() {
    try {
        const team = await API.request('/api/users');
        const reports = await API.request('/api/reports/training');
        
        const workers = team.filter(u => u.role === 'Worker');
        const teamEl = document.getElementById('stat-team');
        if (teamEl) teamEl.innerText = workers.length;

        let passed = 0;
        let failed = 0;
        let overdue = 0;
        let notStarted = 0;

        const tbody = document.getElementById('activity-table-body');
        tbody.innerHTML = '';

        reports.forEach(r => {
            if (r.status === 'Passed' || r.status === 'Completed') passed++;
            else if (r.status === 'Failed') failed++;
            else if (new Date(r.due_date) < new Date()) {
                r.status = 'Overdue';
                overdue++;
            } else {
                notStarted++;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.first_name} ${r.last_name}</td>
                <td>${r.module}</td>
                <td>${getStatusBadge(r.status)}</td>
                <td>${r.score !== null ? r.score + '%' : '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        const completedEl = document.getElementById('stat-completed');
        if (completedEl) completedEl.innerText = passed;
        
        const overdueEl = document.getElementById('stat-overdue');
        if (overdueEl) overdueEl.innerText = overdue;
        
        const rateEl = document.getElementById('stat-rate');
        if (rateEl) rateEl.innerText = reports.length ? Math.round((passed / reports.length) * 100) + '%' : '0%';

        // Render Trend Chart
        const trendCtx = document.getElementById('trendChart');
        if(trendCtx) {
            new Chart(trendCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar'],
                    datasets: [{
                        label: 'Compliance Trend',
                        data: [42, 51, 57],
                        borderColor: '#2ed573',
                        tension: 0.3,
                        fill: false
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // Render Agency Chart
        const agencyCtx = document.getElementById('agencyChart');
        if(agencyCtx) {
            new Chart(agencyCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Logistics', 'Dispatch', 'Warehouse'],
                    datasets: [{
                        label: 'Completion %',
                        data: [75, 67, 50],
                        backgroundColor: ['#1bbcff', '#ffb142', '#2ed573']
                    }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
        }

        // Populate Training Programs
        const programList = document.getElementById('program-list');
        if(programList) {
            programList.innerHTML = '';
            const mockModules = [
                { name: 'PPE', rate: 75 },
                { name: 'Manual Handling', rate: 67 },
                { name: 'Fire Safety', rate: 60 },
                { name: 'Hazard Awareness', rate: 50 }
            ];
            mockModules.forEach(mod => {
                programList.innerHTML += `
                    <div style="background: linear-gradient(145deg, #112e5c, #0c2146); border: 1px solid rgba(126,177,255,0.2); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${mod.name}</strong>
                            <p style="font-size: 0.8rem; color: #a9bee3;">Mandatory Core Training</p>
                        </div>
                        <strong style="color: ${mod.rate > 65 ? '#2ed573' : '#ffb142'}">${mod.rate}%</strong>
                    </div>
                `;
            });
        }

    } catch (e) {
        console.error(e);
    }
}

async function loadWorkers() {
    const team = await API.request('/api/users');
    const workers = team.filter(u => u.role === 'Worker');
    const tbody = document.getElementById('workers-table-body');
    tbody.innerHTML = '';

    workers.forEach(w => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${w.first_name} ${w.last_name}</td>
            <td>${w.email}</td>
            <td>${w.department || 'N/A'}</td>
            <td>${w.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editWorker(${w.id}, '${w.first_name}', '${w.last_name}', '${w.email}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteWorker(${w.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadReports() {
    const reports = await API.request('/api/reports/training');
    const tbody = document.getElementById('reports-table-body');
    tbody.innerHTML = '';

    reports.forEach(r => {
        if (new Date(r.due_date) < new Date() && r.status !== 'Passed') {
            r.status = 'Overdue';
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.first_name} ${r.last_name}</td>
            <td>${r.department || '-'}</td>
            <td>${r.module}</td>
            <td>${getStatusBadge(r.status)}</td>
            <td>${r.score !== null ? r.score + '%' : '-'}</td>
            <td>${new Date(r.due_date).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function showAssignModal() {
    document.getElementById('assign-modal').classList.remove('hidden');
    document.getElementById('assign-error').classList.add('hidden');
    
    // Load users
    const team = await API.request('/api/users');
    const workers = team.filter(u => u.role === 'Worker' && u.is_active);
    const uSelect = document.getElementById('assign-user');
    uSelect.innerHTML = workers.map(w => `<option value="${w.id}">${w.first_name} ${w.last_name}</option>`).join('');

    // Load modules
    const modules = await API.request('/api/modules');
    const mSelect = document.getElementById('assign-module');
    mSelect.innerHTML = modules.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
}

document.getElementById('assign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('assign-error');
    errorDiv.classList.add('hidden');

    const data = {
        user_id: document.getElementById('assign-user').value,
        module_id: document.getElementById('assign-module').value,
        due_date: document.getElementById('assign-date').value
    };

    try {
        await API.request('/api/assignments', {
            method: 'POST',
            body: data
        });
        document.getElementById('assign-modal').classList.add('hidden');
        loadDashboard();
        alert('Assignment successful');
    } catch (e) {
        errorDiv.innerText = e.message;
        errorDiv.classList.remove('hidden');
    }
});

async function exportCSV() {
    const reports = await API.request('/api/reports/training');
    let csv = 'Worker,Department,Module,Status,Score,Due Date\n';
    reports.forEach(r => {
        let status = r.status;
        if (new Date(r.due_date) < new Date() && r.status !== 'Passed') {
            status = 'Overdue';
        }
        const d = new Date(r.due_date);
        const safeDate = r.due_date ? d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear() : '';
        csv += `"${r.first_name} ${r.last_name}","${r.department || ''}","${r.module}","${status}","${r.score||''}","=""${safeDate}"""\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training_report.csv';
    a.click();
}

function showWorkerModal() {
    document.getElementById('worker-modal-title').innerText = 'Add Worker';
    document.getElementById('worker-form').reset();
    document.getElementById('worker-id').value = '';
    document.getElementById('worker-password-group').classList.remove('hidden');
    document.getElementById('worker-password').required = true;
    document.getElementById('worker-modal').classList.remove('hidden');
    document.getElementById('worker-error').classList.add('hidden');
}

function editWorker(id, fn, ln, email) {
    document.getElementById('worker-modal-title').innerText = 'Edit Worker';
    document.getElementById('worker-form').reset();
    document.getElementById('worker-id').value = id;
    document.getElementById('worker-fn').value = fn;
    document.getElementById('worker-ln').value = ln;
    document.getElementById('worker-email').value = email;
    // Hide password field for edits (optional in this basic prototype)
    document.getElementById('worker-password-group').classList.add('hidden');
    document.getElementById('worker-password').required = false;
    document.getElementById('worker-modal').classList.remove('hidden');
    document.getElementById('worker-error').classList.add('hidden');
}

document.getElementById('worker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('worker-error');
    errorDiv.classList.add('hidden');

    const id = document.getElementById('worker-id').value;
    const data = {
        first_name: document.getElementById('worker-fn').value,
        last_name: document.getElementById('worker-ln').value,
        email: document.getElementById('worker-email').value,
        role_id: 1, // Worker role
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
        } else {
            await API.request('/api/users', { method: 'POST', body: data });
        }
        document.getElementById('worker-modal').classList.add('hidden');
        loadWorkers();
    } catch (e) {
        errorDiv.innerText = e.message;
        errorDiv.classList.remove('hidden');
    }
});

async function deleteWorker(id) {
    if (confirm('Are you sure you want to delete this worker?')) {
        try {
            await API.request(`/api/users/${id}`, { method: 'DELETE' });
            loadWorkers();
        } catch (e) {
            alert('Error deleting worker: ' + e.message);
        }
    }
}

async function loadReminders() {
    try {
        const assignments = await API.request('/api/assignments/team');
        const tbody = document.getElementById('sup-reminders-body');
        tbody.innerHTML = '';
        
        assignments.forEach(a => {
            let status = a.status;
            if (new Date(a.due_date) < new Date() && status !== 'Passed') {
                status = 'Overdue';
            }
            
            if (status === 'Overdue' || status === 'Not started' || status === 'In Progress') {
                const tr = document.createElement('tr');
                let urgency = status === 'Overdue' ? '<span class="text-error">Overdue</span>' : '<span class="text-warning">Due Soon</span>';
                
                tr.innerHTML = `
                    <td>${a.first_name} ${a.last_name}</td>
                    <td>${a.module}</td>
                    <td>${urgency}</td>
                    <td>${new Date(a.due_date).toLocaleDateString()}</td>
                    <td><button class="btn btn-primary btn-sm" onclick="sendReminder(this, '${a.first_name}')">Send Reminder</button></td>
                `;
                tbody.appendChild(tr);
            }
        });
    } catch (e) {
        console.error('Failed to load reminders', e);
    }
}

window.sendReminder = function(btn, name) {
    btn.innerText = 'Sent!';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-success');
    btn.disabled = true;
    setTimeout(() => alert('Reminder sent to ' + name), 100);
}

const originalShowView = window.showView || function(){};
window.showView = function(viewId) {
    originalShowView(viewId);
    if (viewId === 'reminders') loadReminders();
};
