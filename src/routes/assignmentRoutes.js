const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { get, all, run } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/assignments/me - Get assignments for logged in user
router.get('/me', requireAuth, async (req, res) => {
    try {
        const assignments = await all(`
            SELECT a.id, a.module_id, m.title, m.description, a.due_date, a.status, a.score, a.completed_date, a.attempt_count 
            FROM assignments a
            JOIN modules m ON a.module_id = m.id
            WHERE a.user_id = ?
        `, [req.session.userId]);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/assignments/team - Get assignments for team (Supervisor/Admin)
router.get('/team', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const assignments = await all(`
            SELECT a.id, u.first_name, u.last_name, u.email, m.title as module, a.due_date, a.status, a.score, a.completed_date
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
        `);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/assignments - Assign training (Supervisor/Admin)
router.post('/', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const { user_id, module_id, due_date } = req.body;
        if (!user_id || !module_id || !due_date) return res.status(400).json({ error: 'Missing fields' });

        // Check if assignment exists
        const existing = await get(`SELECT id FROM assignments WHERE user_id = ? AND module_id = ?`, [user_id, module_id]);
        if (existing) return res.status(400).json({ error: 'Assignment already exists' });

        await run(`INSERT INTO assignments (user_id, module_id, assigned_by, due_date, status) VALUES (?, ?, ?, ?, 'Not started')`,
                  [user_id, module_id, req.session.userId, due_date]);
        
        res.status(201).json({ message: 'Assignment created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/assignments/:id/submit - Submit quiz
router.post('/:id/submit', requireAuth, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { answers } = req.body; // { question_id: option_id }

        const assignment = await get(`SELECT * FROM assignments WHERE id = ? AND user_id = ?`, [assignmentId, req.session.userId]);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        
        const moduleData = await get(`SELECT pass_mark FROM modules WHERE id = ?`, [assignment.module_id]);
        
        // Calculate score
        let correctCount = 0;
        let totalCount = 0;
        const questions = await all(`SELECT id FROM questions WHERE module_id = ?`, [assignment.module_id]);
        totalCount = questions.length;

        for (let q of questions) {
            const correctOpt = await get(`SELECT id FROM options WHERE question_id = ? AND is_correct = 1`, [q.id]);
            if (answers[q.id] == correctOpt.id) {
                correctCount++;
            }
        }

        const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        const passed = score >= moduleData.pass_mark ? 1 : 0;
        const newStatus = passed ? 'Passed' : 'Failed';
        const completedDate = passed ? new Date().toISOString() : null;

        // Record Attempt
        await run(`INSERT INTO quiz_attempts (assignment_id, score, passed) VALUES (?, ?, ?)`, [assignmentId, score, passed]);

        // Update Assignment
        const attemptCount = assignment.attempt_count + 1;
        
        if (passed) {
            await run(`UPDATE assignments SET status = 'Passed', score = ?, completed_date = ?, attempt_count = ? WHERE id = ?`,
                      [score, completedDate, attemptCount, assignmentId]);
            
            // Issue Certificate
            const certRef = crypto.randomBytes(6).toString('hex').toUpperCase();
            await run(`INSERT OR IGNORE INTO certificates (assignment_id, certificate_ref) VALUES (?, ?)`, [assignmentId, certRef]);
        } else {
            await run(`UPDATE assignments SET status = 'Failed', score = ?, attempt_count = ? WHERE id = ?`,
                      [score, attemptCount, assignmentId]);
        }

        res.json({ message: 'Quiz submitted', score, passed, pass_mark: moduleData.pass_mark });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/assignments/:id/certificate - Get certificate
router.get('/:id/certificate', requireAuth, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        
        const cert = await get(`
            SELECT c.certificate_ref, c.issue_date, u.first_name, u.last_name, m.title, a.score
            FROM certificates c
            JOIN assignments a ON c.assignment_id = a.id
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            WHERE c.assignment_id = ? AND (a.user_id = ? OR ? IN (2, 3))
        `, [assignmentId, req.session.userId, req.session.roleId]);

        if (!cert) return res.status(404).json({ error: 'Certificate not found' });
        
        const html = `
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
                <div class="recipient">${cert.first_name} ${cert.last_name}</div>
                <div class="text">has successfully completed the training module:</div>
                <div class="course">${cert.title}</div>
                
                <div class="details">
                    <div class="detail-box">
                        <div class="detail-label">Score</div>
                        <div class="detail-value">${cert.score}%</div>
                    </div>
                    <div class="detail-box">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${new Date(cert.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div class="detail-box">
                        <div class="detail-label">Certificate ID</div>
                        <div class="detail-value">SW-${cert.title.substring(0,2).toUpperCase()}-2026-${cert.certificate_ref}</div>
                    </div>
                </div>
                
                <div class="actions">
                    <button class="print" onclick="window.print()">Print / Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>
            </div>
        </body>
        </html>
        `;
        res.send(html);

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
