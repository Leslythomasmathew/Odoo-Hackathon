import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db/database.js';
import { JWT_SECRET, authenticate, validatePassword } from '../middleware/auth.js';

const router = express.Router();

// Helper to sign JWT
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Check email availability for real-time validation
router.get('/check-email', (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.json({ available: false, message: '' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
  res.json({
    available: !existing,
    message: existing ? 'An account with this email already exists.' : 'Email is available!'
  });
});

// AUTH-1, AUTH-2, AUTH-3: Customer signup
router.post('/register', (req, res) => {
  const { email, password, name, company, phone, billing_address } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  // Validate password policy
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ error: passwordCheck.message });
  }

  // Check unique email
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Each email can belong to only one account.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  try {
    db.exec('BEGIN TRANSACTION;');

    // Create user with customer role
    const userResult = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'customer')
    `).run(email.trim().toLowerCase(), password_hash, name.trim());

    const userId = Number(userResult.lastInsertRowid);

    // Create linked customer entry
    const customerResult = db.prepare(`
      INSERT INTO customers (user_id, name, email, phone, company, billing_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name.trim(),
      email.trim().toLowerCase(),
      phone || null,
      company || name.trim(),
      billing_address || null
    );

    db.exec('COMMIT;');

    const user = {
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: 'customer',
      customerId: Number(customerResult.lastInsertRowid)
    };

    const token = signToken(user);
    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  let customerId = null;
  if (user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id);
    if (cust) customerId = cust.id;
  }

  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    customerId
  };

  const token = signToken(userData);
  res.json({
    message: 'Login successful.',
    token,
    user: userData
  });
});

// AUTH-4: Forgot password request
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = db.prepare('SELECT id, email, name FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    // For security, still return success message or inform in demo mode
    return res.json({
      message: 'If the email is registered, a password reset link has been sent.',
      simulation: null
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(`
    UPDATE users
    SET reset_token = ?, reset_token_expiry = ?
    WHERE id = ?
  `).run(resetToken, expiry, user.id);

  const resetUrl = `/reset-password?token=${resetToken}`;

  // Log simulation
  db.prepare(`
    INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('password_reset', 'Password Reset Link Generated', `Sent password reset link to ${user.email}`, user.id, 'user', 'System');

  res.json({
    message: 'A password reset link has been generated and sent to the registered email.',
    simulation: {
      email: user.email,
      resetToken,
      resetUrl,
      note: 'In this environment, click the link directly or paste token to reset.'
    }
  });
});

// AUTH-4: Reset password with token
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  // Validate password policy
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    return res.status(400).json({ error: passwordCheck.message });
  }

  const user = db.prepare(`
    SELECT id, email, reset_token_expiry
    FROM users
    WHERE reset_token = ?
  `).get(token);

  if (!user) {
    return res.status(400).json({ error: 'Invalid or unrecognized reset token.' });
  }

  if (user.reset_token_expiry && new Date(user.reset_token_expiry) < new Date()) {
    return res.status(400).json({ error: 'Password reset token has expired. Please request a new one.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  db.prepare(`
    UPDATE users
    SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL
    WHERE id = ?
  `).run(password_hash, user.id);

  res.json({ message: 'Password has been reset successfully. You can now log in.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  let customerId = null;
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id, name, company FROM customers WHERE user_id = ?').get(req.user.id);
    if (cust) customerId = cust.id;
  }

  res.json({
    user: {
      ...req.user,
      customerId
    }
  });
});

// Demo helper: quick switch user without re-entering passwords
router.post('/switch-user', (req, res) => {
  const { role, email } = req.body;
  let user;

  if (email) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  } else if (role) {
    user = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(role);
  }

  if (!user) {
    return res.status(404).json({ error: 'User for switch not found.' });
  }

  let customerId = null;
  if (user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id);
    if (cust) customerId = cust.id;
  }

  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    customerId
  };

  const token = signToken(userData);
  res.json({
    message: `Switched user to ${user.name} (${user.role})`,
    token,
    user: userData
  });
});

export default router;
