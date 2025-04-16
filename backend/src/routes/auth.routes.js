import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js'; // Import auth middleware

const prisma = new PrismaClient();
const router = express.Router();

// --- Registration ---
router.post(
  '/register',
  // Validation rules
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    const { username, email, password } = req.body; // Data is validated

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (existingUser) {
        return res.status(409).json({ message: 'Username or email already exists.' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: { username, email, passwordHash },
        select: { id: true, username: true, email: true, role: true, usernameColor: true, createdAt: true } // Select fields to return
      });

      res.status(201).json({ message: 'User registered successfully', user });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error during registration.' });
    }
  }
);

// --- Login ---
router.post(
  '/login',
  // Validation rules
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    const { email, password } = req.body; // Data is validated

    try {
      // Find user by email
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // Generate JWT
      const payload = { userId: user.id, role: user.role }; // Include role in payload
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("JWT_SECRET is not defined in .env file!");
        return res.status(500).json({ message: 'Internal server error (JWT configuration).' });
      }
      const token = jwt.sign(payload, secret, { expiresIn: '1d' }); // Token expires in 1 day

      // Return token and user info (excluding password hash)
      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ message: 'Login successful', token, user: userWithoutPassword });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error during login.' });
    }
  }
);

// --- Update User Profile (e.g., usernameColor) ---
router.put(
    '/profile',
    authenticateToken,
    // Validation rules
    body('usernameColor').optional({ nullable: true }).isHexColor().withMessage('Invalid hex color code.'),
    body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.'),
    handleValidationErrors,
    async (req, res) => {
        const userId = req.user.userId;
        const { usernameColor, username } = req.body; // Get validated data

        const updateData = {};
        if (usernameColor !== undefined) updateData.usernameColor = usernameColor;
        if (username !== undefined) updateData.username = username;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided (username or usernameColor).' });
        }

        try {
            // If username is being updated, check for uniqueness first
            if (username !== undefined) {
                const existingUser = await prisma.user.findFirst({
                    where: { username: username, NOT: { id: userId } }, // Check other users
                });
                if (existingUser) {
                    return res.status(409).json({ message: 'Username already taken.' });
                }
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: { id: true, username: true, email: true, role: true, usernameColor: true, createdAt: true, updatedAt: true } // Return updated user data
            });
            res.json({ message: 'Profile updated successfully', user: updatedUser });
        } catch (error) {
            console.error(`Error updating profile for user ${userId}:`, error);
            res.status(500).json({ message: 'Internal server error updating profile.' });
        }
    }
);


export default router;
