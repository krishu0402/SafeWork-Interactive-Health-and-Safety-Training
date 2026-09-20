const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');
code = code.replace(
    "if (viewId === 'reports') loadReports();",
    "originalShowView(viewId);\n    if (viewId === 'reports') loadReports();"
);
fs.writeFileSync('public/js/admin.js', code);
