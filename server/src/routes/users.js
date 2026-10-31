import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticate, requireRole, validatePassword } from '../middleware/auth.js';

const router = express.Router();

// List all staff / users (Admin and Staff can view team members)
router.get('/', authenticate, (req, res) => {
  const { role } = req.query;
  let query = 'SELECT id, email, name, role, created_at FROM users';
  const params = [];

  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }

  query += ' ORDER BY id ASC';
  const users = db.prepare(query).all(...params);
  res.json({ users });
});

// AUTH-6: ONLY THE ADMIN CAN ADD A NEW MEMBER OF STAFF
router.post('/staff', authenticate, requireRole(['admin']), (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required to create a staff member.' });
  }

  // Validate password policy
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ error: passwordCheck.message });
  }

  // Check unique email
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  try {
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'staff')
    `).run(email.trim().toLowerCase(), password_hash, name.trim());

    db.prepare(`
      INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('staff_created', 'New Staff Member Added', `Admin added ${name.trim()} (${email.trim()}) as staff.`, Number(result.lastInsertRowid), 'user', req.user.name);

    res.status(201).json({
      message: 'Internal staff member created successfully.',
      staff: {
        id: Number(result.lastInsertRowid),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'staff'
      }
    });
  } catch (err) {
    console.error('Error creating staff member:', err);
    res.status(500).json({ error: 'Failed to create staff member.' });
  }
});

// Admin can delete or update staff
router.delete('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: 'User deleted successfully.' });
});

export default router;
