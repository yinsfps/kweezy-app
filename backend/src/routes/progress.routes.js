import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// --- Get User Progress for a Novel ---
router.get(
    '/novel/:novelId',
    authenticateToken,
    param('novelId').isInt({ min: 1 }).withMessage('Novel ID must be a positive integer.'),
    handleValidationErrors,
    async (req, res) => {
        const userId = req.user.userId;
        const { novelId } = req.params;

        try {
            const progress = await prisma.userNovelProgress.findUnique({
                where: { userId_novelId: { userId, novelId: parseInt(novelId) } },
                include: { chapter: { select: { chapterNumber: true } } } // Include chapter number
            });

            if (!progress) {
                // Return default/null progress if none exists yet
                return res.json(null);
                // Or return res.status(404).json({ message: 'Progress not found for this novel.' });
            }
            res.json(progress);
        } catch (error) {
            console.error(`Error fetching progress for user ${userId}, novel ${novelId}:`, error);
            res.status(500).json({ message: 'Internal server error fetching progress.' });
        }
    }
);

// --- Update User Progress for a Novel ---
router.put(
    '/novel/:novelId',
    authenticateToken,
    param('novelId').isInt({ min: 1 }).withMessage('Novel ID must be a positive integer.'),
    body('lastReadChapterId').isInt({ min: 1 }).withMessage('Chapter ID must be a positive integer.'),
    body('lastReadScrollY').isFloat({ min: 0 }).withMessage('Scroll position must be a non-negative number.'),
    handleValidationErrors,
    async (req, res) => {
        const userId = req.user.userId;
        const { novelId } = req.params;
        const { lastReadChapterId, lastReadScrollY } = req.body;

        try {
            // Optional: Verify chapter belongs to the novel
            const chapter = await prisma.chapter.findUnique({ where: { id: parseInt(lastReadChapterId) } });
            if (!chapter || chapter.novelId !== parseInt(novelId)) {
                return res.status(400).json({ message: 'Invalid chapter ID for this novel.' });
            }

            const progress = await prisma.userNovelProgress.upsert({
                where: { userId_novelId: { userId, novelId: parseInt(novelId) } },
                update: { lastReadChapterId: parseInt(lastReadChapterId), lastReadScrollY: parseFloat(lastReadScrollY) },
                create: { userId, novelId: parseInt(novelId), lastReadChapterId: parseInt(lastReadChapterId), lastReadScrollY: parseFloat(lastReadScrollY) },
                include: { chapter: { select: { chapterNumber: true } } } // Include chapter number in response
            });
            res.json({ message: 'Progress updated successfully', progress });
        } catch (error) {
            console.error(`Error updating progress for user ${userId}, novel ${novelId}:`, error);
            res.status(500).json({ message: 'Internal server error updating progress.' });
        }
    }
);

export default router;
