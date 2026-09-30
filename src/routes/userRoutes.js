const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { get, all, run } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/users — Get all users (Supervisor/Admin)
router.get('/', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const users = await all(`
            SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
                   r.name as role, r.id as role_id,
                   d.name as department, d.id as department_id,
                   s.name as shift, s.id as shift_id,
                   u.created_at, u.last_login
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN shifts s ON u.shift_id = s.id
            ORDER BY r.id, u.last_name
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/users/roles — List available roles
router.get('/roles', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const roles = await all(`SELECT id, name FROM roles ORDER BY id`);
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/users/departments — List departments
router.get('/departments', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const departments = await all(`SELECT id, name FROM departments ORDER BY name`);
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/users — Create new user (Admin or Supervisor — Supervisor can only create workers)
router.post('/', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const { first_name, last_name, email, password, role_id, department_id, shift_id } = req.body;

        if (!first_name || !last_name || !email || !password || !role_id) {
            return res.status(400).json({ error: 'First name, last name, email, password and role are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Supervisor can only create Workers (role 1)
        if (req.session.roleId === 2 && parseInt(role_id) !== 1) {
            return res.status(403).json({ error: 'Supervisors can only create Worker accounts' });
        }

        const existing = await get(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        await run(`INSERT INTO users (first_name, last_name, email, password_hash, role_id, department_id, shift_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, hash, role_id, department_id || null, shift_id || null]);

        const newUser = await get(`SELECT last_insert_rowid() as id`);

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'CREATE', 'User', newUser.id]);

        res.status(201).json({ message: 'User created successfully', id: newUser.id });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/users/:id — Update user (Admin or Supervisor modifying worker)
router.put('/:id', requireAuth, requireRole([2, 3]), async (req, res) => {
    try {
        const { first_name, last_name, email, department_id, shift_id, is_active, role_id } = req.body;
        const targetId = req.params.id;

        const targetUser = await get(`SELECT role_id FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Supervisor can only modify workers
        if (req.session.roleId === 2 && targetUser.role_id !== 1) {
            return res.status(403).json({ error: 'Supervisors can only modify Worker accounts' });
        }

        // Admin can also update role; Supervisor cannot
        const newRoleId = req.session.roleId === 3 && role_id ? role_id : targetUser.role_id;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({ error: 'First name, last name and email are required' });
        }

        // Check email uniqueness (excluding current user)
        const emailCheck = await get(`SELECT id FROM users WHERE email = ? AND id != ?`, [email, targetId]);
        if (emailCheck) return res.status(400).json({ error: 'Email already in use by another account' });

        await run(`UPDATE users SET first_name=?, last_name=?, email=?, department_id=?, shift_id=?, is_active=?, role_id=? WHERE id=?`,
            [first_name, last_name, email, department_id || null, shift_id || null, is_active !== undefined ? is_active : 1, newRoleId, targetId]);

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'UPDATE', 'User', targetId]);

        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/users/:id/toggle — Activate or deactivate a user (Admin only)
router.put('/:id/toggle', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const targetId = req.params.id;

        // Prevent admin from deactivating themselves
        if (parseInt(targetId) === req.session.userId) {
            return res.status(400).json({ error: 'You cannot deactivate your own account' });
        }

        const targetUser = await get(`SELECT id, is_active, first_name, last_name FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const newStatus = targetUser.is_active ? 0 : 1;
        await run(`UPDATE users SET is_active = ? WHERE id = ?`, [newStatus, targetId]);

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
            [req.session.userId, newStatus ? 'ACTIVATE' : 'DEACTIVATE', 'User', targetId,
                `${targetUser.first_name} ${targetUser.last_name}`]);

        res.json({
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            is_active: newStatus
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/users/:id — Delete user (Admin only — soft delete by deactivation recommended)
router.delete('/:id', requireAuth, requireRole([3]), async (req, res) => {
    try {
        const targetId = req.params.id;

        if (parseInt(targetId) === req.session.userId) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const targetUser = await get(`SELECT role_id FROM users WHERE id = ?`, [targetId]);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        await run(`DELETE FROM users WHERE id=?`, [targetId]);

        await run(`INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)`,
            [req.session.userId, 'DELETE', 'User', targetId]);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
