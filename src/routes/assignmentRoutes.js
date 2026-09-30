const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { get, all, run } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/assignments/me — Get assignments for logged-in worker
router.get('/me', requireAuth, async (req, res) => {
    try {
        const assignments = await all(`
            SELECT a.id, a.module_id, m.title, m.description, m.pass_mark, m.duration_minutes,
                   a.due_date, a.status, a.score, a.completed_date, a.attempt_count
            FROM assignments a
            JOIN modules m ON a.module_id = m.id
            WHERE a.user_id = ?
            ORDER BY a.due_date ASC
        `, [req.session.userId]);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/assignments/me/stats — Summary stats for worker dashboard
router.get('/me/stats', requireAuth, async (req, res) => {
    try {
        const assignments = await all(`
            SELECT a.id, a.status, a.due_date, a.score, a.completed_date, m.title
            FROM assignments a
            JOIN modules m ON a.module_id = m.id
            WHERE a.user_id = ?
        `, [req.session.userId]);

        const now = new Date();
        let completed = 0, inProgress = 0, overdue = 0, notStarted = 0;

        for (const a of assignments) {
            if (a.status === 'Passed' || a.status === 'Completed') {
                completed++;
            } else if (a.status === 'In Progress') {
                inProgress++;
                if (new Date(a.due_date) < now) overdue++;
            } else if (a.status === 'Failed') {
                // Failed but not yet re-attempted — counts as outstanding
                if (new Date(a.due_date) < now) overdue++;
                else notStarted++;
            } else {
                // Not started
                if (new Date(a.due_date) < now) overdue++;
                else notStarted++;
            }
        }

        const total = assignments.length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

        res.json({
            total,
            completed,
            in_progress: inProgress,
            overdue,
            not_started: notStarted,
            outstanding: total - completed,
            completion_pct: completionPct
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/assignments/team — Get all assignments (Supervisor/Admin)
router.get('/team', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const assignments = await all(`
            SELECT a.id, u.first_name, u.last_name, u.email, d.name as department,
                   m.title as module, a.due_date, a.status, a.score, a.completed_date, a.attempt_count
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role_id = 1
            ORDER BY a.due_date ASC
        `);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/assignments/team/stats — Aggregate team stats for Supervisor dashboard
router.get('/team/stats', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const assignments = await all(`
            SELECT a.id, a.status, a.due_date, a.score, u.id as user_id,
                   m.title as module, m.id as module_id
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            WHERE u.role_id = 1
        `);

        const workers = await all(`SELECT id FROM users WHERE role_id = 1`);
        const modules = await all(`SELECT id, title FROM modules WHERE is_active = 1`);

        const now = new Date();
        let passed = 0, failed = 0, inProgress = 0, overdue = 0;

        for (const a of assignments) {
            const isOverdue = new Date(a.due_date) < now && a.status !== 'Passed' && a.status !== 'Completed';
            if (a.status === 'Passed' || a.status === 'Completed') passed++;
            else if (a.status === 'Failed') { failed++; if (isOverdue) overdue++; }
            else if (a.status === 'In Progress') { inProgress++; if (isOverdue) overdue++; }
            else if (isOverdue) overdue++;
        }

        // Per-module completion rate
        const moduleStats = {};
        for (const m of modules) {
            const moduleAssignments = assignments.filter(a => a.module_id === m.id);
            const modPassed = moduleAssignments.filter(a => a.status === 'Passed' || a.status === 'Completed').length;
            moduleStats[m.title] = moduleAssignments.length > 0
                ? Math.round((modPassed / moduleAssignments.length) * 100)
                : 0;
        }

        const total = assignments.length;
        const complianceRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        res.json({
            total_workers: workers.length,
            total_assignments: total,
            completed: passed,
            in_progress: inProgress,
            failed,
            overdue,
            compliance_rate: complianceRate,
            module_stats: moduleStats
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/assignments — Assign training (Supervisor/Admin)
router.post('/', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const { user_id, module_id, due_date } = req.body;
        if (!user_id || !module_id || !due_date) return res.status(400).json({ error: 'Missing required fields' });

        const existing = await get(`SELECT id FROM assignments WHERE user_id = ? AND module_id = ?`, [user_id, module_id]);
        if (existing) return res.status(400).json({ error: 'This module is already assigned to this worker' });

        await run(`INSERT INTO assignments (user_id, module_id, assigned_by, due_date, status, attempt_count)
                   VALUES (?, ?, ?, ?, 'Not started', 0)`,
            [user_id, module_id, req.session.userId, due_date]);

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'ASSIGN', 'Assignment', user_id]);

        res.status(201).json({ message: 'Training assigned successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/assignments/:id/start — Mark assignment as In Progress
router.put('/:id/start', requireAuth, async (req, res) => {
    try {
        const assignment = await get(
            `SELECT * FROM assignments WHERE id = ? AND user_id = ?`,
            [req.params.id, req.session.userId]
        );
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        // Only update if not already passed
        if (assignment.status !== 'Passed' && assignment.status !== 'Completed') {
            await run(`UPDATE assignments SET status = 'In Progress' WHERE id = ?`, [req.params.id]);
        }

        res.json({ message: 'Assignment started' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/assignments/:id/submit — Submit quiz answers
router.post('/:id/submit', requireAuth, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { answers } = req.body; // { question_id: option_id }

        const assignment = await get(`SELECT * FROM assignments WHERE id = ? AND user_id = ?`,
            [assignmentId, req.session.userId]);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        const moduleData = await get(`SELECT pass_mark FROM modules WHERE id = ?`, [assignment.module_id]);

        const questions = await all(`SELECT id FROM questions WHERE module_id = ? ORDER BY order_index`, [assignment.module_id]);
        let correctCount = 0;
        const totalCount = questions.length;

        // Collect question-level feedback
        const questionResults = [];
        for (const q of questions) {
            const correctOpt = await get(`SELECT id, option_text FROM options WHERE question_id = ? AND is_correct = 1`, [q.id]);
            const submittedOptId = answers ? answers[q.id] : null;
            const submittedOpt = submittedOptId
                ? await get(`SELECT option_text FROM options WHERE id = ?`, [submittedOptId])
                : null;
            const qData = await get(`SELECT question_text, explanation FROM questions WHERE id = ?`, [q.id]);
            const isCorrect = correctOpt && String(submittedOptId) === String(correctOpt.id);
            if (isCorrect) correctCount++;

            questionResults.push({
                question_text: qData.question_text,
                explanation: qData.explanation,
                correct_answer: correctOpt ? correctOpt.option_text : '',
                submitted_answer: submittedOpt ? submittedOpt.option_text : 'Not answered',
                is_correct: isCorrect
            });
        }

        const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        const passed = score >= moduleData.pass_mark ? 1 : 0;
        const completedDate = passed ? new Date().toISOString() : null;
        const attemptCount = assignment.attempt_count + 1;

        // Record quiz attempt
        await run(`INSERT INTO quiz_attempts (assignment_id, score, passed) VALUES (?, ?, ?)`,
            [assignmentId, score, passed]);

        if (passed) {
            await run(`UPDATE assignments SET status = 'Passed', score = ?, completed_date = ?, attempt_count = ? WHERE id = ?`,
                [score, completedDate, attemptCount, assignmentId]);

            // Issue certificate if not already exists
            const existingCert = await get(`SELECT id FROM certificates WHERE assignment_id = ?`, [assignmentId]);
            if (!existingCert) {
                const certRef = crypto.randomBytes(6).toString('hex').toUpperCase();
                await run(`INSERT INTO certificates (assignment_id, certificate_ref) VALUES (?, ?)`, [assignmentId, certRef]);
            }
        } else {
            await run(`UPDATE assignments SET status = 'Failed', score = ?, attempt_count = ? WHERE id = ?`,
                [score, attemptCount, assignmentId]);
        }

        res.json({
            message: 'Quiz submitted',
            score,
            passed,
            pass_mark: moduleData.pass_mark,
            total_questions: totalCount,
            correct_answers: correctCount,
            question_results: questionResults
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/assignments/:id/certificate — Serve certificate as HTML
router.get('/:id/certificate', requireAuth, async (req, res) => {
    try {
        const assignmentId = req.params.id;

        const cert = await get(`
            SELECT c.certificate_ref, c.issue_date, u.first_name, u.last_name, m.title, a.score, a.completed_date
            FROM certificates c
            JOIN assignments a ON c.assignment_id = a.id
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            WHERE c.assignment_id = ? AND (a.user_id = ? OR ? IN (2, 3))
        `, [assignmentId, req.session.userId, req.session.roleId]);

        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        const issueDate = cert.issue_date || cert.completed_date || new Date().toISOString();
        const formattedDate = new Date(issueDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const certId = `SW-${cert.title.substring(0, 2).toUpperCase()}-${new Date(issueDate).getFullYear()}-${cert.certificate_ref}`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Completion – SafeWork</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .cert-wrapper { background: white; width: 820px; max-width: 100%; padding: 60px; text-align: center; border: 12px solid #07152f; outline: 4px solid #18b8ff; outline-offset: -8px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); position: relative; }
        
        .brand { font-size: 1.8rem; font-weight: 900; color: #07152f; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 5px; }
        .brand span { color: #18b8ff; }
        .brand-sub { font-size: 0.85rem; color: #6b7c93; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 30px; }
        .divider { width: 80px; height: 3px; background: linear-gradient(90deg, #18b8ff, #07152f); margin: 0 auto 30px; border-radius: 2px; }
        h1 { color: #07152f; font-size: 2.4rem; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
        .subtitle { font-size: 1.1rem; color: #6b7c93; margin-bottom: 5px; }
        .recipient-name { font-size: 2.8rem; font-weight: 700; color: #07152f; font-family: Georgia, serif; font-style: italic; margin: 20px 0; padding: 15px 0; border-bottom: 2px solid #e8ecf0; display: inline-block; min-width: 400px; }
        .completion-text { font-size: 1.1rem; color: #6b7c93; margin: 15px 0 5px; }
        .module-name { font-size: 1.8rem; font-weight: 700; color: #18b8ff; margin: 10px 0 30px; }
        .details-grid { display: flex; justify-content: center; gap: 40px; margin: 30px 0; padding: 25px 0; border-top: 1px dashed #d0dae6; border-bottom: 1px dashed #d0dae6; }
        .detail-item { text-align: center; }
        .detail-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; color: #8fa3b8; margin-bottom: 5px; }
        .detail-value { font-size: 1.1rem; font-weight: 700; color: #07152f; }
        .safetech-name { font-size: 0.9rem; color: #6b7c93; margin-top: 25px; }
        .safetech-name strong { color: #07152f; }
        .actions { margin-top: 30px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
        .btn { padding: 12px 28px; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.85; }
        .btn-print { background: #07152f; color: white; }
        .btn-close { background: #18b8ff; color: white; }
        @media print {
            body { background: white; padding: 0; }
            .cert-wrapper { border: 12px solid #000; outline: 4px solid #333; box-shadow: none; }
            .actions { display: none; }
            
        }
    </style>
</head>
<body>
    <div class="cert-wrapper">
        
        <div class="brand">Safe<span>Work</span></div>
        <div class="brand-sub">by SafeTech Solutions</div>
        <div class="divider"></div>
        <h1>Certificate of Completion</h1>
        <p class="subtitle">This is to certify that</p>
        <div class="recipient-name">${cert.first_name} ${cert.last_name}</div>
        <p class="completion-text">has successfully completed the training module</p>
        <div class="module-name">${cert.title}</div>
        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">Score Achieved</div>
                <div class="detail-value">${cert.score}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date Issued</div>
                <div class="detail-value">${formattedDate}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Certificate ID</div>
                <div class="detail-value">${certId}</div>
            </div>
        </div>
        <p class="safetech-name">Issued by <strong>SafeTech Solutions</strong> — SafeWork Health &amp; Safety Training Platform</p>
        <div class="actions">
            <button class="btn btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
            <button class="btn btn-close" onclick="window.close()">Close</button>
        </div>
    </div>
</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
