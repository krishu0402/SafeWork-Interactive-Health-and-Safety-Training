const fs = require('fs');

function fixAdmin() {
    let code = fs.readFileSync('public/js/admin.js', 'utf8');
    code = code.replace(
        "csv += `\"${a.first_name} ${a.last_name}\",\"${a.email}\",\"${a.module}\",\"${a.status}\",\"${a.score !== null ? a.score + '%' : '-'}\",\"${safeDate}\"\\n`;",
        "csv += `\"${a.first_name} ${a.last_name}\",\"${a.email}\",\"${a.module}\",\"${a.status}\",\"${a.score !== null ? a.score + '%' : '-'}\",\"=\"\"${safeDate}\"\"\"\\n`;"
    );
    fs.writeFileSync('public/js/admin.js', code);
}

function fixSup() {
    let code = fs.readFileSync('public/js/supervisor.js', 'utf8');
    code = code.replace(
        "csv += `\"${r.first_name} ${r.last_name}\",\"${r.department || ''}\",\"${r.module}\",\"${status}\",\"${r.score||''}\",\"${safeDate}\"\\n`;",
        "csv += `\"${r.first_name} ${r.last_name}\",\"${r.department || ''}\",\"${r.module}\",\"${status}\",\"${r.score||''}\",\"=\"\"${safeDate}\"\"\"\\n`;"
    );
    fs.writeFileSync('public/js/supervisor.js', code);
}

function fixWorker() {
    let code = fs.readFileSync('public/js/worker.js', 'utf8');
    code = code.replace(
        "const passedDate = a.completed_date ? new Date(a.completed_date).toLocaleDateString() : '-';\n            csv += `\"${a.title}\",\"${a.status}\",\"${new Date(a.due_date).toLocaleDateString()}\",\"${passedDate}\",\"${a.score || 0}%\"\\n`;",
        `const d1 = new Date(a.completed_date);
            const passedDate = a.completed_date ? d1.getDate().toString().padStart(2, '0') + '/' + (d1.getMonth() + 1).toString().padStart(2, '0') + '/' + d1.getFullYear() : '-';
            const d2 = new Date(a.due_date);
            const dueDate = a.due_date ? d2.getDate().toString().padStart(2, '0') + '/' + (d2.getMonth() + 1).toString().padStart(2, '0') + '/' + d2.getFullYear() : '-';
            csv += \`"\${a.title}","\${a.status}","=""\${dueDate}""","=""\${passedDate}""","\${a.score || 0}%"\\n\`;`
    );
    // fallback for LF
    code = code.replace(
        "const passedDate = a.completed_date ? new Date(a.completed_date).toLocaleDateString() : '-';\r\n            csv += `\"${a.title}\",\"${a.status}\",\"${new Date(a.due_date).toLocaleDateString()}\",\"${passedDate}\",\"${a.score || 0}%\"\\n`;",
        `const d1 = new Date(a.completed_date);
            const passedDate = a.completed_date ? d1.getDate().toString().padStart(2, '0') + '/' + (d1.getMonth() + 1).toString().padStart(2, '0') + '/' + d1.getFullYear() : '-';
            const d2 = new Date(a.due_date);
            const dueDate = a.due_date ? d2.getDate().toString().padStart(2, '0') + '/' + (d2.getMonth() + 1).toString().padStart(2, '0') + '/' + d2.getFullYear() : '-';
            csv += \`"\${a.title}","\${a.status}","=""\${dueDate}""","=""\${passedDate}""","\${a.score || 0}%"\\n\`;`
    );
    fs.writeFileSync('public/js/worker.js', code);
}

fixAdmin();
fixSup();
fixWorker();
console.log('done');
