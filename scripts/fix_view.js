const fs = require('fs');

function fixAdmin() {
    let code = fs.readFileSync('public/js/admin.js', 'utf8');
    code = code.replace(
        "document.querySelectorAll('.content-area').forEach(el => el.classList.add('hidden'));",
        "document.querySelectorAll('.content-area').forEach(el => el.classList.add('hidden'));"
    );
    fs.writeFileSync('public/js/admin.js', code);
}

function fixSupervisor() {
    let code = fs.readFileSync('public/js/supervisor.js', 'utf8');
    let replacement = `document.querySelectorAll('.content-area').forEach(el => el.classList.add('hidden'));
    const view = document.getElementById('view-' + viewId);
    if(view) view.classList.remove('hidden');`;
    
    code = code.replace(
        "document.getElementById('view-dashboard').classList.add('hidden');\r\n    document.getElementById('view-workers').classList.add('hidden');\r\n    document.getElementById('view-reports').classList.add('hidden');\r\n    \r\n    document.getElementById(`view-${viewId}`).classList.remove('hidden');",
        replacement
    );
    
    // Fallback for LF
    code = code.replace(
        "document.getElementById('view-dashboard').classList.add('hidden');\n    document.getElementById('view-workers').classList.add('hidden');\n    document.getElementById('view-reports').classList.add('hidden');\n    \n    document.getElementById(`view-${viewId}`).classList.remove('hidden');",
        replacement
    );
    
    fs.writeFileSync('public/js/supervisor.js', code);
}

fixSupervisor();
console.log('done');
