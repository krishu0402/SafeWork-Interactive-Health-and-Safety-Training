const express = require('express');
const router = express.Router();
const { all } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/reports/training - Detailed training report (Supervisor/Admin)
router.get('/training', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        let query = `
            SELECT u.first_name, u.last_name, u.email, d.name as department, s.name as shift,
                   m.title as module, a.status, a.score, a.due_date, a.completed_date,
                   c.certificate_ref
            FROM assignments a
            JOIN users u ON a.user_id = u.id
            JOIN modules m ON a.module_id = m.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN shifts s ON u.shift_id = s.id
            LEFT JOIN certificates c ON a.id = c.assignment_id
            WHERE u.role_id = 1
        `;
        
        // Basic filtering could be applied via req.query here

        const report = await all(query);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
