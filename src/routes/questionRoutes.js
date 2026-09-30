const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/questions?module_id=X — list questions for a module (Admin)
router.get('/', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const { module_id } = req.query;
        if (!module_id) return res.status(400).json({ error: 'module_id is required' });

        const questions = await all(
            `SELECT q.id, q.question_text, q.explanation, q.order_index FROM questions q
             WHERE q.module_id = ? ORDER BY q.order_index, q.id`,
            [module_id]
        );

        for (const q of questions) {
            q.options = await all(
                `SELECT id, option_text, is_correct FROM options WHERE question_id = ? ORDER BY id`,
                [q.id]
            );
        }

        res.json(questions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/questions — create question + options (Admin only)
router.post('/', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const { module_id, question_text, explanation, options } = req.body;

        if (!module_id || !question_text || !options || options.length < 2) {
            return res.status(400).json({ error: 'module_id, question_text and at least 2 options are required' });
        }

        const correctOptions = options.filter(o => o.is_correct);
        if (correctOptions.length !== 1) {
            return res.status(400).json({ error: 'Exactly one correct answer must be selected' });
        }

        // Get next order_index
        const maxOrder = await get(`SELECT COALESCE(MAX(order_index), -1) as max_idx FROM questions WHERE module_id = ?`, [module_id]);
        const orderIndex = (maxOrder ? maxOrder.max_idx : -1) + 1;

        await run(
            `INSERT INTO questions (module_id, question_text, explanation, order_index) VALUES (?, ?, ?, ?)`,
            [module_id, question_text, explanation || '', orderIndex]
        );

        const newQ = await get(`SELECT last_insert_rowid() as id`);
        const qId = newQ.id;

        for (const opt of options) {
            await run(
                `INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
                [qId, opt.option_text, opt.is_correct ? 1 : 0]
            );
        }

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'CREATE', 'Question', qId]);

        res.status(201).json({ message: 'Question created successfully', id: qId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/questions/:id — update question and its options (Admin only)
router.put('/:id', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const qId = req.params.id;
        const { question_text, explanation, options } = req.body;

        if (!question_text) return res.status(400).json({ error: 'question_text is required' });

        await run(
            `UPDATE questions SET question_text = ?, explanation = ? WHERE id = ?`,
            [question_text, explanation || '', qId]
        );

        if (options && options.length >= 2) {
            const correctOptions = options.filter(o => o.is_correct);
            if (correctOptions.length !== 1) {
                return res.status(400).json({ error: 'Exactly one correct answer must be selected' });
            }

            // Delete existing options and re-insert
            await run(`DELETE FROM options WHERE question_id = ?`, [qId]);
            for (const opt of options) {
                await run(
                    `INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
                    [qId, opt.option_text, opt.is_correct ? 1 : 0]
                );
            }
        }

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'UPDATE', 'Question', qId]);

        res.json({ message: 'Question updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/questions/:id — delete question (cascades to options) (Admin only)
router.delete('/:id', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const qId = req.params.id;
        const existing = await get(`SELECT id FROM questions WHERE id = ?`, [qId]);
        if (!existing) return res.status(404).json({ error: 'Question not found' });

        await run(`DELETE FROM questions WHERE id = ?`, [qId]);

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'DELETE', 'Question', qId]);

        res.json({ message: 'Question deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
