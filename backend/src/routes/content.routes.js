import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware.js'; // Import auth middleware
import { param } from 'express-validator'; // Import validation functions
import { handleValidationErrors } from '../middleware/validation.middleware.js'; // Import handler

const prisma = new PrismaClient();
const router = express.Router();

// --- Get All Novels ---
router.get('/novels', async (req, res) => {
  try {
    const novels = await prisma.novel.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, authorName: true, description: true,
        coverImageUrl: true, createdAt: true,
      }
    });
    res.json(novels);
  } catch (error) {
    console.error('Error fetching novels:', error);
    res.status(500).json({ message: 'Internal server error fetching novels.' });
  }
});

// --- Get Single Novel (with Chapters and OPTIONAL User Progress) ---
router.get(
    '/novels/:novelId',
    // authenticateToken, // REMOVED: Allow unauthenticated access
    param('novelId').isInt({ min: 1 }).withMessage('Novel ID must be a positive integer.'),
    handleValidationErrors,
    async (req, res) => {
        const { novelId } = req.params;
        // Explicitly check if req.user exists before getting userId
        const userId = req.user ? req.user.userId : null;

        try {
            // Base query includes chapters
            const queryOptions = {
                where: { id: parseInt(novelId) },
                include: {
                    chapters: {
                        orderBy: { chapterNumber: 'asc' },
                        select: { id: true, title: true, chapterNumber: true }
                    }
                }
            };

            // Conditionally include progress if user is logged in
            if (userId) {
                queryOptions.include.progress = {
                    where: { userId: userId },
                    include: { chapter: { select: { chapterNumber: true } } }
                };
            }

            const novel = await prisma.novel.findUnique(queryOptions);
            // Removed duplicated where/include clauses below
            if (!novel) {
                return res.status(404).json({ message: 'Novel not found.' });
            }

            // Format the response: Add userProgress only if it was fetched (i.e., user was logged in)
            if (novel.progress && novel.progress.length > 0) {
                novel.userProgress = novel.progress[0];
            } else {
                novel.userProgress = null; // Explicitly set to null if no progress found or user not logged in
            }
            // Only delete progress if it exists on the object
            if ('progress' in novel) {
                delete novel.progress;
            }

            res.json(novel);
        } catch (error) {
            console.error(`Error fetching novel ${novelId}:`, error);
            res.status(500).json({ message: 'Internal server error fetching novel details.' });
        }
    }
);

// --- Get Chapter Content Segments ---
router.get('/chapters/:chapterId/segments', async (req, res) => {
  const { chapterId } = req.params;
  try {
    const chapterExists = await prisma.chapter.findUnique({
        where: { id: parseInt(chapterId) }, select: { id: true }
    });
    if (!chapterExists) return res.status(404).json({ message: 'Chapter not found.' });

    const segments = await prisma.chapterContentSegment.findMany({
      where: { chapterId: parseInt(chapterId) },
      orderBy: { segmentIndex: 'asc' },
      select: { id: true, segmentIndex: true, segmentType: true, textContent: true, }
    });
    res.json(segments);
  } catch (error) {
    console.error(`Error fetching segments for chapter ${chapterId}:`, error);
    res.status(500).json({ message: 'Internal server error fetching chapter content.' });
  }
});

export default router;
