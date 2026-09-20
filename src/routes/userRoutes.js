const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { get, all, run } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper to check if role exists
const checkRole = async (roleId) => await get(`SELECT id FROM roles WHERE id = ?`, [roleId]);

// GET /api/users - Get all users (Admin only)
router.get('/', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const users = await all(`SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, r.name as role, d.name as department, s.name as shift
                                 FROM users u
                                 JOIN roles r ON u.role_id = r.id
                                 LEFT JOIN departments d ON u.department_id = d.id
                                 LEFT JOIN shifts s ON u.shift_id = s.id`);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/users - Create new user (Admin or Supervisor - Supervisor can only create workers)
router.post('/', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const { first_name, last_name, email, password, role_id, department_id, shift_id } = req.body;
        
        if (!first_name || !last_name || !email || !password || !role_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Supervisor can only create Workers (role 1)
        if (req.session.roleId === 2 && parseInt(role_id) !== 1) {
            return res.status(403).json({ error: 'Supervisors can only create Worker accounts' });
        }

        const existing = await get(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        
        await run(`INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, shift_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                   [first_name, last_name, email, hash, role_id, department_id, shift_id]);
                   
        const newUser = await get(`SELECT last_insert_rowid() as id`);
        
        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`, 
                  [req.session.userId, 'CREATE', 'User', newUser.id]);
                  
        res.status(201).json({ message: 'User created successfully', id: newUser.id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/users/:id - Update user (Admin or Supervisor modifying worker)
router.put('/:id', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const { first_name, last_name, email, department_id, shift_id, is_active } = req.body;
        const targetId = req.params.id;

        const targetUser = await get(`SELECT role_id FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Supervisor can only modify workers
        if (req.session.roleId === 2 && targetUser.role_id !== 1) {
            return res.status(403).json({ error: 'Supervisors can only modify Worker accounts' });
        }

        await run(`UPDATE users SET first_name=?, last_name=?, email=?, department_id=?, shift_id=?, is_active=? WHERE id=?`, 
                  [first_name, last_name, email, department_id, shift_id, is_active, targetId]);
        
        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`, 
                  [req.session.userId, 'UPDATE', 'User', targetId]);
                  
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/users/:id - Delete/Deactivate user
router.delete('/:id', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const targetId = req.params.id;
        const targetUser = await get(`SELECT role_id FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Supervisor can only delete workers
        if (req.session.roleId === 2 && targetUser.role_id !== 1) {
            return res.status(403).json({ error: 'Supervisors can only delete Worker accounts' });
        }

        await run(`DELETE FROM users WHERE id=?`, [targetId]);
        
        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`, 
                  [req.session.userId, 'DELETE', 'User', targetId]);
                  
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
