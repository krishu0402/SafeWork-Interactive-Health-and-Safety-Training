const express = require('express');
const router = express.Router();
const { all, get } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/reports/training — Detailed training report (Supervisor/Admin)
router.get('/training', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const report = await all(`
            SELECT u.first_name, u.last_name, u.email, d.name as department, s.name as shift,
                   m.title as module, a.status, a.score, a.due_date, a.completed_date,
                   a.attempt_count, c.certificate_ref
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN shifts s ON u.shift_id = s.id
            LEFT JOIN certificates c ON a.id = c.assignment_id
            WHERE u.role_id = 1
            ORDER BY u.last_name, m.title
        `);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/reports/failed — Failed assessments list (Supervisor/Admin)
router.get('/failed', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const failed = await all(`
            SELECT u.first_name, u.last_name, u.email, d.name as department,
                   m.title as module, a.score, a.due_date, a.attempt_count, a.id as assignment_id
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role_id = 1 AND a.status = 'Failed'
            ORDER BY a.due_date ASC
        `);
        res.json(failed);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/reports/admin — Full system stats for Admin dashboard
router.get('/admin', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const users = await all(`SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id`);
        const modules = await all(`SELECT id FROM modules WHERE is_active = 1`);
        const assignments = await all(`
            SELECT a.id, a.status, a.due_date, a.score
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            WHERE u.role_id = 1
        `);
        const certificates = await all(`SELECT id FROM certificates`);

        const now = new Date();
        let completed = 0, overdue = 0;
        let totalScore = 0, scoreCount = 0;

        for (const a of assignments) {
            if (a.status === 'Passed' || a.status === 'Completed') completed++;
            if (a.status !== 'Passed' && a.status !== 'Completed' && new Date(a.due_date) < now) overdue++;
            if (a.score !== null) { totalScore += a.score; scoreCount++; }
        }

        const total = assignments.length;
        const compliancePct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

        const workers = users.filter(u => u.role === 'Worker').length;
        const supervisors = users.filter(u => u.role === 'Supervisor').length;
        const admins = users.filter(u => u.role === 'Administrator').length;

        res.json({
            total_users: users.length,
            workers,
            supervisors,
            admins,
            total_modules: modules.length,
            total_assignments: total,
            completed,
            overdue,
            certificates_issued: certificates.length,
            compliance_pct: compliancePct,
            avg_score: avgScore
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
