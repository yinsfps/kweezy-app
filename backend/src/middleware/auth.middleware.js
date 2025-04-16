import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file for middleware.");
  process.exit(1);
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' }); // if there isn't any token
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      // Differentiate between expired token and invalid token
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized: Token expired.' });
      }
      return res.status(403).json({ message: 'Forbidden: Invalid token.' }); // Token is invalid
    }

    // Attach user payload (userId, username, role) to the request object
    req.user = user;
    next(); // Proceed to the next middleware or route handler
  });
};

// Optional: Middleware to check for specific roles (e.g., admin)
export const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    // Ensure authenticateToken middleware runs first to attach req.user
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ message: `Forbidden: Requires ${requiredRole} role.` });
    }
    next();
  };
};

// Example usage in a route file:
// import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';
// router.post('/some-admin-action', authenticateToken, authorizeRole('admin'), (req, res) => { ... });
// router.post('/some-user-action', authenticateToken, (req, res) => { ... }); // Just needs login
