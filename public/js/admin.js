document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await API.request('/api/auth/me');
        if (user.role !== 'Administrator') {
            window.location.href = '/login.html';
        }
        document.getElementById('user-info').innerText = user.email;
        loadDashboard();
    } catch (e) {
        console.error(e);
    }
});

function showView(viewId) {
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-users').classList.add('hidden');
    document.getElementById('view-modules').classList.add('hidden');
    
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    if(viewId === 'dashboard') loadDashboard();
    if(viewId === 'users') loadUsers();
    if(viewId === 'modules') loadModules();
}

async function loadDashboard() {
    try {
        const users = await API.request('/api/users');
        const modules = await API.request('/api/modules');
        
        document.getElementById('stat-users').innerText = users.length;
        document.getElementById('stat-modules').innerText = modules.length;

        // Render Chart
        if (window.adminChartInstance) {
            window.adminChartInstance.destroy();
        }
        const canvas = document.getElementById('adminChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const roles = users.reduce((acc, u) => {
            acc[u.role] = (acc[u.role] || 0) + 1;
            return acc;
        }, {});

        window.adminChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(roles),
                datasets: [{
                    data: Object.values(roles),
                    backgroundColor: ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

    } catch (e) {
        console.error(e);
    }
}

async function loadUsers() {
    try {
        const users = await API.request('/api/users');
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-info">${u.role}</span></td>
                <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadModules() {
    try {
        const modules = await API.request('/api/modules');
        const tbody = document.getElementById('modules-table-body');
        tbody.innerHTML = '';

        modules.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.title}</strong><br><small class="text-muted">${m.description || ''}</small></td>
                <td>${m.pass_mark}%</td>
                <td>${m.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Archived</span>'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editModule(${m.id}, '${m.title.replace(/'/g, "\\'")}', '${(m.description || '').replace(/'/g, "\\'")}', ${m.pass_mark})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteModule(${m.id})">Archive</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
    }
}

function showModuleModal() {
    document.getElementById('module-modal').classList.remove('hidden');
    document.getElementById('module-error').classList.add('hidden');
    document.getElementById('module-form').reset();
    document.getElementById('mod-id').value = '';
    document.querySelector('#module-modal h3').innerText = 'Create Module';
}

function editModule(id, title, desc, passMark) {
    showModuleModal();
    document.querySelector('#module-modal h3').innerText = 'Edit Module';
    document.getElementById('mod-id').value = id;
    document.getElementById('mod-title').value = title;
    document.getElementById('mod-desc').value = desc;
    document.getElementById('mod-pass').value = passMark;
}

async function deleteModule(id) {
    if(!confirm('Are you sure you want to archive this module?')) return;
    try {
        await API.request(`/api/modules/${id}`, { method: 'DELETE' });
        loadModules();
        alert('Module archived successfully');
    } catch(e) {
        alert('Failed to archive module: ' + e.message);
    }
}

async function sendReminders() {
    try {
        const res = await API.request('/api/modules/notify', { method: 'POST' });
        showToast(res.message);
    } catch(e) {
        showToast('Failed to send reminders: ' + e.message, 'error');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.color = '#fff';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.fontSize = '1.1rem';
    toast.style.fontWeight = 'bold';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-in-out';
    toast.innerText = message;

    container.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.getElementById('module-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('module-error');
    errorDiv.classList.add('hidden');

    const id = document.getElementById('mod-id').value;
    const data = {
        title: document.getElementById('mod-title').value,
        description: document.getElementById('mod-desc').value,
        pass_mark: parseInt(document.getElementById('mod-pass').value),
        is_active: 1
    };

    try {
        if(id) {
            await API.request(`/api/modules/${id}`, {
                method: 'PUT',
                body: data
            });
            showToast('Module updated successfully');
        } else {
            await API.request('/api/modules', {
                method: 'POST',
                body: data
            });
            showToast('Module created successfully');
        }
        document.getElementById('module-modal').classList.add('hidden');
        loadModules();
    } catch (e) {
        errorDiv.innerText = e.message;
        errorDiv.classList.remove('hidden');
    }
});

async function loadReports() {
    try {
        const assignments = await API.request('/api/assignments/team');
        const tbody = document.getElementById('admin-report-body');
        tbody.innerHTML = '';
        
        let totalWorkers = new Set();
        let completed = 0, inprogress = 0, notstarted = 0, overdue = 0;
        let totalScore = 0, scoreCount = 0;

        assignments.forEach(a => {
            totalWorkers.add(a.email);
            
            if (a.status === 'Passed' || a.status === 'Completed') completed++;
            else if (a.status === 'In Progress') inprogress++;
            else if (a.status === 'Overdue') overdue++;
            else notstarted++;

            if (a.score !== null) {
                totalScore += a.score;
                scoreCount++;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.first_name} ${a.last_name}</td>
                <td>${a.email}</td>
                <td>${a.module}</td>
                <td>${a.status}</td>
                <td>${a.score !== null ? a.score + '%' : '-'}</td>
                <td>${new Date(a.due_date).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('rep-total-workers').innerText = totalWorkers.size;
        document.getElementById('rep-total-assign').innerText = assignments.length;
        document.getElementById('rep-completed').innerText = completed;
        document.getElementById('rep-inprogress').innerText = inprogress;
        document.getElementById('rep-notstarted').innerText = notstarted;
        document.getElementById('rep-overdue').innerText = overdue;
        document.getElementById('rep-avgscore').innerText = scoreCount > 0 ? Math.round(totalScore / scoreCount) + '%' : '0%';
        document.getElementById('rep-completion').innerText = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) + '%' : '0%';
        
        window.adminReportsData = assignments;
    } catch (e) {
        console.error('Failed to load reports', e);
    }
}

function exportAdminReportCSV() {
    if (!window.adminReportsData) return;
    let csv = 'Worker,Email,Module,Status,Score,Due Date\n';
    window.adminReportsData.forEach(a => {
        const d = new Date(a.due_date);
        const safeDate = a.due_date ? d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear() : '';
        csv += `"${a.first_name} ${a.last_name}","${a.email}","${a.module}","${a.status}","${a.score !== null ? a.score + '%' : '-'}","=""${safeDate}"""\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Organisation_Training_Report.csv';
    a.click();
}

async function loadCertificates() {
    try {
        const assignments = await API.request('/api/assignments/team');
        const tbody = document.getElementById('admin-certs-body');
        tbody.innerHTML = '';
        
        assignments.filter(a => a.status === 'Passed' || a.status === 'Completed').forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.first_name} ${a.last_name}</td>
                <td>${a.module}</td>
                <td>${a.score}%</td>
                <td>${new Date(a.completed_date).toLocaleDateString()}</td>
                <td><span class="badge badge-success">Issued</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="window.open('/api/assignments/${a.id}/certificate', '_blank')">View Certificate</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Failed to load certificates', e);
    }
}

const originalShowView = window.showView || function(){};
window.showView = function(viewId) {
    originalShowView(viewId);
    if (viewId === 'reports') loadReports();
    if (viewId === 'certificates') loadCertificates();
    
    document.querySelectorAll('.content-area').forEach(el => el.classList.add('hidden'));
    const view = document.getElementById('view-' + viewId);
    if(view) view.classList.remove('hidden');
    
    document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));
    if (window.event && window.event.target && window.event.target.tagName === 'A') {
        window.event.target.classList.add('active');
    }
};
