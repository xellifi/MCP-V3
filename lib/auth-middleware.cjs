// JWT Auth Middleware for Express (CommonJS)
// Used in server.cjs to protect API routes

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION';

/**
 * Middleware: verifies JWT and attaches user to req.user
 * Returns 401 if token is missing or invalid
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.slice(7).trim();

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // { userId, email, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

/**
 * Middleware: requireAuth + role must be 'admin' or 'owner'
 */
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'owner') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        next();
    });
}

module.exports = { requireAuth, requireAdmin };
