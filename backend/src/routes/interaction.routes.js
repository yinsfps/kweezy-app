import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// --- Get Comments for a Segment ---
router.get(
  '/segments/:segmentId/comments',
  // authenticateToken, // REMOVED: Allow unauthenticated access to view comments
  param('segmentId').isInt({ min: 1 }).withMessage('Segment ID must be a positive integer.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.').toInt(),
  handleValidationErrors,
  async (req, res) => {
    const { segmentId } = req.params;
    const pageNum = req.query.page || 1;
    const limitNum = req.query.limit || 10; // Default limit
    const skip = (pageNum - 1) * limitNum;
    const userId = req.user?.userId; // Get userId from authenticated token (optional)

    try {
      const commentsRaw = await prisma.comment.findMany({
        where: { segmentId: parseInt(segmentId) },
        // Include like count and user info
        include: {
          user: {
            select: { id: true, username: true, usernameColor: true }
          },
          _count: { // Prisma feature to count relations
            select: { likes: true },
          },
          // Include the like from the current user if logged in
          likes: userId ? {
            where: { userId: userId }
          } : false, // Conditionally include based on login status
        },
        // We will sort manually after fetching for the custom logic
        // orderBy: { createdAt: 'desc' }, // Temporarily remove default sort
        skip: parseInt(skip) || 0,
        take: parseInt(limitNum) || 10, // Keep pagination for fetching
      });

      // Format comments: add likeCount and likedByCurrentUser fields
      let comments = commentsRaw.map(comment => ({
        ...comment,
        likeCount: comment._count.likes,
        likedByCurrentUser: userId ? comment.likes.length > 0 : false, // Check if the user's like was included
        // Remove Prisma specific fields
        _count: undefined,
        likes: undefined,
      }));

      // --- Custom Sorting Logic ---
      // 1. Sort by likeCount descending primarily, then createdAt descending
      comments.sort((a, b) => {
          if (b.likeCount !== a.likeCount) {
              return b.likeCount - a.likeCount; // Higher likes first
          }
          // If likes are equal, sort by newest first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // 2. Inject random comments (safer implementation)
      const injectRandomComment = (targetIndex, startIndex) => {
          if (comments.length > startIndex) {
              // Ensure we only pick from valid indices *after* the target insertion point
              const poolStartIndex = Math.max(startIndex, targetIndex + 1);
              if (comments.length > poolStartIndex) {
                  const randomIndex = Math.floor(Math.random() * (comments.length - poolStartIndex)) + poolStartIndex;
                  // Check if randomIndex is valid before splicing
                  if (randomIndex >= 0 && randomIndex < comments.length) {
                      const randomComment = comments.splice(randomIndex, 1)[0];
                      // Ensure targetIndex is still valid after splice (should be fine if randomIndex > targetIndex)
                      if (targetIndex >= 0 && targetIndex <= comments.length) {
                           comments.splice(targetIndex, 0, randomComment);
                           return true; // Indicate success
                      } else {
                          // Put it back if target index became invalid (shouldn't happen with this logic)
                          comments.splice(randomIndex, 0, randomComment);
                      }
                  }
              }
          }
          return false; // Indicate failure or not applicable
      };

      // Inject at 3rd position (index 2), picking from index 3 onwards
      const injectedAt3 = injectRandomComment(2, 3);

      // Inject at 5th position (index 4), picking from index 5 onwards
      // The array length and indices are now potentially different if injection at 3 happened
      injectRandomComment(4, 5);

      // --- End Custom Sorting ---


      const totalComments = await prisma.comment.count({
          where: { segmentId: parseInt(segmentId) },
      });

      res.json({
          comments, // Return sorted comments
          totalPages: Math.ceil(totalComments / limitNum),
          currentPage: pageNum
      });

    } catch (error) {
      console.error(`Error fetching comments for segment ${segmentId}:`, error);
      res.status(500).json({ message: 'Internal server error fetching comments.' });
    }
});

// --- Create a Comment ---
router.post(
  '/segments/:segmentId/comments',
  authenticateToken,
  param('segmentId').isInt({ min: 1 }).withMessage('Segment ID must be a positive integer.'),
  body('commentText').trim().notEmpty().withMessage('Comment text cannot be empty.')
                   .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters.'),
  body('parentCommentId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Parent Comment ID must be a positive integer.'),
  handleValidationErrors,
  async (req, res) => {
    const { segmentId } = req.params;
    const { commentText, parentCommentId } = req.body;
    const userId = req.user.userId;

    try {
      const segmentExists = await prisma.chapterContentSegment.findUnique({ where: { id: parseInt(segmentId) } });
      if (!segmentExists) return res.status(404).json({ message: 'Segment not found.' });

      if (parentCommentId) {
        const parentExists = await prisma.comment.findUnique({ where: { id: parseInt(parentCommentId) } });
        if (!parentExists || parentExists.segmentId !== parseInt(segmentId)) {
          return res.status(400).json({ message: 'Invalid parent comment.' });
        }
      }

      const newComment = await prisma.comment.create({
        data: {
          commentText, userId, segmentId: parseInt(segmentId),
          parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
        },
        include: {
          user: { select: { id: true, username: true, usernameColor: true } },
          _count: { select: { likes: true } } // Include like count
        }
      });

      // Format response
      const formattedComment = {
          ...newComment,
          likeCount: newComment._count.likes,
          likedByCurrentUser: false, // New comment can't be liked by creator yet
          _count: undefined,
      };

      res.status(201).json(formattedComment);

    } catch (error) {
      console.error(`Error creating comment for segment ${segmentId}:`, error);
      res.status(500).json({ message: 'Internal server error creating comment.' });
    }
});

// --- Get Reactions for a Segment ---
router.get(
  '/segments/:segmentId/reactions',
  param('segmentId').isInt({ min: 1 }).withMessage('Segment ID must be a positive integer.'),
  handleValidationErrors,
  async (req, res) => {
    const { segmentId } = req.params;
    try {
        const reactionCounts = await prisma.reaction.groupBy({
            by: ['reactionType'], where: { segmentId: parseInt(segmentId) },
            _count: { reactionType: true },
        });
        const formattedCounts = reactionCounts.reduce((acc, curr) => {
            acc[curr.reactionType] = curr._count.reactionType; return acc;
        }, {});
        res.json(formattedCounts);
    } catch (error) {
        console.error(`Error fetching reactions for segment ${segmentId}:`, error);
        res.status(500).json({ message: 'Internal server error fetching reactions.' });
    }
});


// --- Add/Remove a Segment Reaction ---
router.post(
  '/segments/:segmentId/reactions',
  authenticateToken,
  param('segmentId').isInt({ min: 1 }).withMessage('Segment ID must be a positive integer.'),
  body('reactionType').trim().notEmpty().withMessage('Reaction type is required.')
                     .isLength({ max: 20 }).withMessage('Reaction type too long.'),
  handleValidationErrors,
  async (req, res) => {
    const { segmentId } = req.params;
    const { reactionType } = req.body;
    const userId = req.user.userId;

    try {
      const segmentExists = await prisma.chapterContentSegment.findUnique({ where: { id: parseInt(segmentId) } });
      if (!segmentExists) return res.status(404).json({ message: 'Segment not found.' });

      const existingReaction = await prisma.reaction.findUnique({
        where: { userId_segmentId_reactionType: { userId, segmentId: parseInt(segmentId), reactionType } },
      });

      if (existingReaction) {
        await prisma.reaction.delete({ where: { id: existingReaction.id } });
        res.status(200).json({ message: 'Reaction removed.' });
      } else {
        await prisma.reaction.create({ data: { userId, segmentId: parseInt(segmentId), reactionType } });
        res.status(201).json({ message: 'Reaction added.' });
      }
    } catch (error) {
      console.error(`Error adding/removing reaction for segment ${segmentId}:`, error);
      res.status(500).json({ message: 'Internal server error updating reaction.' });
    }
});

// --- NEW: Toggle Like on a Comment ---
router.post(
    '/comments/:commentId/like',
    authenticateToken, // User must be logged in to like
    param('commentId').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer.'),
    handleValidationErrors,
    async (req, res) => {
        const { commentId } = req.params;
        const userId = req.user.userId;

        try {
            // Check if comment exists
            const commentExists = await prisma.comment.findUnique({ where: { id: parseInt(commentId) } });
            if (!commentExists) {
                return res.status(404).json({ message: 'Comment not found.' });
            }

            // Check if user already liked this comment
            const existingLike = await prisma.commentLike.findUnique({
                where: { userId_commentId: { userId, commentId: parseInt(commentId) } },
            });

            if (existingLike) {
                // Unlike the comment
                await prisma.commentLike.delete({ where: { id: existingLike.id } });
                res.status(200).json({ message: 'Comment unliked.' });
            } else {
                // Like the comment
                await prisma.commentLike.create({
                    data: { userId, commentId: parseInt(commentId) },
                });
                res.status(201).json({ message: 'Comment liked.' });
            }
        } catch (error) {
            console.error(`Error toggling like for comment ${commentId}:`, error);
            res.status(500).json({ message: 'Internal server error toggling comment like.' });
        }
    }
);


export default router;
