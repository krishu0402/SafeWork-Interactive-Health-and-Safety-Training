const fs = require('fs');

let code = fs.readFileSync('public/js/supervisor.js', 'utf8');

code += `
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
                
                tr.innerHTML = \`
                    <td>\${a.first_name} \${a.last_name}</td>
                    <td>\${a.module}</td>
                    <td>\${urgency}</td>
                    <td>\${new Date(a.due_date).toLocaleDateString()}</td>
                    <td><button class="btn btn-primary btn-sm" onclick="sendReminder(this, '\${a.first_name}')">Send Reminder</button></td>
                \`;
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
`;

fs.writeFileSync('public/js/supervisor.js', code);
console.log('done');
