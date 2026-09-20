const fs = require('fs');
let code = fs.readFileSync('src/routes/assignmentRoutes.js', 'utf8');

const replacement = `
        const html = \`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SafeWork - Certificate of Completion</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                .certificate-container { background: white; width: 800px; padding: 50px; text-align: center; border: 15px solid #07152f; outline: 5px solid #18b8ff; outline-offset: -10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: relative; }
                .logo { font-size: 2.5rem; font-weight: 800; color: #07152f; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
                .logo span { color: #18b8ff; }
                h1 { color: #112e5c; font-size: 3rem; margin: 10px 0 30px; border-bottom: 2px solid #e0e5ec; padding-bottom: 20px; }
                .recipient { font-size: 2.5rem; font-weight: bold; color: #18b8ff; margin: 30px 0; font-family: 'Georgia', serif; font-style: italic; }
                .text { font-size: 1.2rem; color: #4a5568; margin: 15px 0; }
                .course { font-size: 2rem; font-weight: bold; color: #07152f; margin: 20px 0; }
                .details { display: flex; justify-content: space-around; margin-top: 50px; padding-top: 30px; border-top: 1px dashed #cbd5e0; }
                .detail-box { text-align: center; }
                .detail-label { font-size: 0.9rem; color: #718096; text-transform: uppercase; letter-spacing: 1px; }
                .detail-value { font-size: 1.2rem; font-weight: bold; color: #2d3748; margin-top: 5px; }
                .actions { margin-top: 30px; }
                button { background: #18b8ff; color: white; border: none; padding: 10px 20px; font-size: 1rem; border-radius: 5px; cursor: pointer; margin: 0 10px; font-weight: bold; }
                button.print { background: #07152f; }
                @media print {
                    body { background: white; }
                    .certificate-container { border: 15px solid #000; box-shadow: none; outline: 5px solid #555; }
                    .actions { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="certificate-container">
                <div class="logo">Safe<span>Work</span></div>
                <h1>Certificate of Completion</h1>
                <div class="text">This is to certify that</div>
                <div class="recipient">\${cert.first_name} \${cert.last_name}</div>
                <div class="text">has successfully completed the training module:</div>
                <div class="course">\${cert.title}</div>
                
                <div class="details">
                    <div class="detail-box">
                        <div class="detail-label">Score</div>
                        <div class="detail-value">\${cert.score}%</div>
                    </div>
                    <div class="detail-box">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">\${new Date(cert.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div class="detail-box">
                        <div class="detail-label">Certificate ID</div>
                        <div class="detail-value">SW-\${cert.title.substring(0,2).toUpperCase()}-2026-\${cert.certificate_ref}</div>
                    </div>
                </div>
                
                <div class="actions">
                    <button class="print" onclick="window.print()">Print / Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>
            </div>
        </body>
        </html>
        \`;
        res.send(html);
`;

code = code.replace("res.json(cert);", replacement);
fs.writeFileSync('src/routes/assignmentRoutes.js', code);
