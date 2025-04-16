import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js'; // Import auth middleware
import { body, param, query } from 'express-validator'; // Import validation functions
import { handleValidationErrors } from '../middleware/validation.middleware.js'; // Import handler

const prisma = new PrismaClient();
const router = express.Router();

// --- Get Published Blog Posts (Public) ---
router.get(
  '/',
  // Validation rules
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20.').toInt(),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    // Use validated and sanitized query params (or defaults)
    const pageNum = req.query.page || 1;
    const limitNum = req.query.limit || 5;
    const skip = (pageNum - 1) * limitNum;

    try {
    // Ensure skip and take are integers
    const posts = await prisma.blogPost.findMany({
      where: { publishedAt: { not: null } }, // Only fetch published posts
      orderBy: { publishedAt: 'desc' }, // Show newest published first
      skip: parseInt(skip) || 0,
      take: parseInt(limitNum) || 5,
      include: { // Include author info
        author: {
          select: { username: true }
        }
      }
    });

    const totalPosts = await prisma.blogPost.count({
        where: { publishedAt: { not: null } },
    });

    res.json({
        posts,
        totalPages: Math.ceil(totalPosts / limitNum),
        currentPage: pageNum
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ message: 'Internal server error fetching blog posts.' });
  }
});

// --- Get Single Blog Post (by ID, Public) ---
router.get(
  '/:postId',
  // Validation rules
  param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer.'),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    const { postId } = req.params; // Validated param
    try {
    const post = await prisma.blogPost.findFirst({
      where: {
        id: parseInt(postId),
        publishedAt: { not: null } // Ensure it's published
      },
      include: {
        author: {
          select: { username: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found or not published.' });
    }
    res.json(post);
  } catch (error) {
    console.error(`Error fetching blog post ${postId}:`, error);
    res.status(500).json({ message: 'Internal server error fetching blog post.' });
  }
});

// --- Create Blog Post (Admin Only) ---
router.post(
  '/',
  authenticateToken, authorizeRole('admin'), // Auth first
  // Validation rules
  body('title').trim().notEmpty().withMessage('Title is required.')
             .isLength({ max: 255 }).withMessage('Title cannot exceed 255 characters.'),
  body('content').trim().notEmpty().withMessage('Content is required.'),
  body('publishNow').optional().isBoolean().withMessage('publishNow must be a boolean.'),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    const { title, content, publishNow } = req.body; // Data is validated
    const authorId = req.user.userId;

    try {
    const newPost = await prisma.blogPost.create({
      data: {
        title,
        content,
        authorId,
        publishedAt: publishNow ? new Date() : null, // Set publish date if flag is true
      },
       include: { // Return the new post with author info
        author: {
          select: { username: true }
        }
      }
    });
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ message: 'Internal server error creating blog post.' });
  }
});

// --- Update Blog Post (Admin Only) ---
router.put(
  '/:postId',
  authenticateToken, authorizeRole('admin'), // Auth first
  // Validation rules
  param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer.'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.')
             .isLength({ max: 255 }).withMessage('Title cannot exceed 255 characters.'),
  body('content').optional().trim().notEmpty().withMessage('Content cannot be empty.'),
  // Validate publishedAt: optional, can be null or a valid ISO8601 date string
  body('publishedAt').optional({ nullable: true }).isISO8601().withMessage('Invalid date format for publishedAt (use ISO8601 or null).').toDate(),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    const { postId } = req.params;
    const { title, content, publishedAt } = req.body; // Data is validated/sanitized

    // Check if at least one field is provided for update
    if (title === undefined && content === undefined && publishedAt === undefined) {
        return res.status(400).json({ message: 'No update data provided (title, content, or publishedAt).' });
    }

    try {
        // Build update object carefully, only including fields that were actually passed
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        // publishedAt is already validated/converted by express-validator if present
        if (publishedAt !== undefined) updateData.publishedAt = publishedAt;

         const updatedPost = await prisma.blogPost.update({
            where: { id: parseInt(postId) },
            data: updateData,
            include: {
                author: { select: { username: true } }
            }
        });
        res.json(updatedPost);
    } catch (error) {
         if (error.code === 'P2025') { // Prisma code for record not found
            return res.status(404).json({ message: 'Blog post not found.' });
        }
        console.error(`Error updating blog post ${postId}:`, error);
        res.status(500).json({ message: 'Internal server error updating blog post.' });
    }
});


// --- Delete Blog Post (Admin Only) ---
router.delete(
  '/:postId',
  authenticateToken, authorizeRole('admin'), // Auth first
  // Validation rules
  param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer.'),
  // Handle validation errors
  handleValidationErrors,
  // Route handler
  async (req, res) => {
    const { postId } = req.params; // Validated param
    try {
        await prisma.blogPost.delete({
            where: { id: parseInt(postId) },
        });
        res.status(204).send(); // No content on successful deletion
    } catch (error) {
        if (error.code === 'P2025') { // Prisma code for record not found
            return res.status(404).json({ message: 'Blog post not found.' });
        }
        console.error(`Error deleting blog post ${postId}:`, error);
        res.status(500).json({ message: 'Internal server error deleting blog post.' });
    }
});


export default router;
