import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-super-secret-jwt-key-2026';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted.' });
    }

    req.user = user;

    // If user is a customer, fetch customer record ID
    if (user.role === 'customer') {
      const customer = db.prepare('SELECT id, name, email, company FROM customers WHERE user_id = ?').get(user.id);
      req.customer = customer || null;
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export const ROLE_HIERARCHY = {
  admin: 3,    // 👑 Admin (Supreme Authority)
  staff: 2,    // 🛡️ Staff (Operational Authority)
  customer: 1  // 👤 User/Customer (Self-Serve Portal)
};

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of [${allowedRoles.join(', ')}], but current user is '${req.user.role}' (Hierarchy Level ${ROLE_HIERARCHY[req.user.role] || 0}). Admin Supreme authority required for this action.`
      });
    }

    next();
  };
}

export function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 999;
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Hierarchy violation: Action requires minimum role '${minRole}' (level ${requiredLevel}), but user is '${req.user.role}' (level ${userLevel}). Admin Supreme authority required.`
      });
    }
    next();
  };
}

// Password policy validator:
// Rule: more than eight characters (>= 9), with at least one uppercase letter, one lowercase letter, and one special character.
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }

  if (password.length <= 8) {
    return { valid: false, message: 'Password must be more than eight characters (at least 9 characters long).' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }

  return { valid: true };
}
