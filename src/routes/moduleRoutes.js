const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/modules - List all active modules
router.get('/', requireAuth, async (req, res) => {
    try {
        const modules = await all(`SELECT id, title, description, pass_mark, is_active, created_at 
                                   FROM modules 
                                   WHERE is_active = 1`);
        res.json(modules);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/modules/:id - Get full module with questions and options (For taking quiz)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const moduleId = req.params.id;
        const moduleData = await get(`SELECT * FROM modules WHERE id = ? AND is_active = 1`, [moduleId]);
        if (!moduleData) return res.status(404).json({ error: 'Module not found' });

        const questions = await all(`SELECT id, question_text, explanation FROM questions WHERE module_id = ? ORDER BY order_index`, [moduleId]);
        
        for (let q of questions) {
            // Do not send is_correct to the client to prevent cheating
            const options = await all(`SELECT id, option_text FROM options WHERE question_id = ?`, [q.id]);
            q.options = options;
        }

        moduleData.questions = questions;
        res.json(moduleData);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/modules - Create new module (Admin only)
router.post('/', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const { title, description, pass_mark, is_active } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        await run(`INSERT INTO modules (title, description, pass_mark, is_active) VALUES (?, ?, ?, ?)`, 
                  [title, description, pass_mark || 70, is_active !== undefined ? is_active : 1]);
        
        const newMod = await get(`SELECT last_insert_rowid() as id`);
        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`, 
                  [req.session.userId, 'CREATE', 'Module', newMod.id]);
        
        res.status(201).json({ message: 'Module created successfully', id: newMod.id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/modules/:id - Edit module (Admin only)
router.put('/:id', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const { title, description, pass_mark, is_active } = req.body;
        await run(`UPDATE modules SET title = ?, description = ?, pass_mark = ?, is_active = ? WHERE id = ?`, 
                  [title, description, pass_mark, is_active, req.params.id]);
        
        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`, 
                  [req.session.userId, 'UPDATE', 'Module', req.params.id]);
        
        res.json({ message: 'Module updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/modules/:id - Delete module (Admin only)
router.delete('/:id', requireAuth, requireRole([3]), async (req, res) => {
    try {
        await run(`UPDATE modules SET is_active = 0 WHERE id = ?`, [req.params.id]);
        
        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`, 
                  [req.session.userId, 'DELETE', 'Module', req.params.id]);
        
        res.json({ message: 'Module archived successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/modules/notify - Send reminders (Admin/Supervisor)
router.post('/notify', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        // Mock notification logic
        res.json({ message: 'Reminders sent to users with overdue/incomplete training.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin can also manage questions and options, but to keep it simple, we focus on the core flow.

module.exports = router;
