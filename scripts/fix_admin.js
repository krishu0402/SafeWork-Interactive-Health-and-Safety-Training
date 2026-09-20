const fs = require('fs');

let adminCode = fs.readFileSync('public/js/admin.js', 'utf8');
let adminIndex = adminCode.indexOf('async function loadReports()');
if (adminIndex > -1) {
    adminCode = adminCode.substring(0, adminIndex);
}
adminCode += `
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
            tr.innerHTML = \`
                <td>\${a.first_name} \${a.last_name}</td>
                <td>\${a.email}</td>
                <td>\${a.module}</td>
                <td>\${a.status}</td>
                <td>\${a.score !== null ? a.score + '%' : '-'}</td>
                <td>\${new Date(a.due_date).toLocaleDateString()}</td>
            \`;
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
    let csv = 'Worker,Email,Module,Status,Score,Due Date\\n';
    window.adminReportsData.forEach(a => {
        const safeDate = a.due_date ? new Date(a.due_date).toISOString().split('T')[0] : '';
        csv += \`"\${a.first_name} \${a.last_name}","\${a.email}","\${a.module}","\${a.status}","\${a.score !== null ? a.score + '%' : '-'}","\${safeDate}"\\n\`;
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
            tr.innerHTML = \`
                <td>\${a.first_name} \${a.last_name}</td>
                <td>\${a.module}</td>
                <td>\${a.score}%</td>
                <td>\${new Date(a.completed_date).toLocaleDateString()}</td>
                <td><span class="badge badge-success">Issued</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="window.open('/api/assignments/\${a.id}/certificate', '_blank')">View Certificate</button></td>
            \`;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Failed to load certificates', e);
    }
}

const originalShowView = window.showView || function(){};
window.showView = function(viewId) {
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
`;
fs.writeFileSync('public/js/admin.js', adminCode);
