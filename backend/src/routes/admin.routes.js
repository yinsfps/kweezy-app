import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware.js';
import multer from 'multer'; // Import multer
import path from 'path'; // Import path
import fs from 'fs'; // Import fs for directory creation
import { fileURLToPath } from 'url'; // Import fileURLToPath for ES Modules

const prisma = new PrismaClient();
const router = express.Router();

// Get __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Multer Configuration for Cover Uploads ---
const coverStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the directory exists relative to the project root (backend/)
    // Use the derived __dirname
    const uploadPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'covers'); // Go up two levels from src/routes
    fs.mkdirSync(uploadPath, { recursive: true }); // Create directory if it doesn't exist
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create a unique filename: bookId-timestamp.extension
    const bookId = req.params.bookId; // Get bookId from route params
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${bookId}-${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const uploadCover = multer({
  storage: coverStorage,
  limits: {
    fileSize: 1024 * 1024 * 2 // 2MB limit
  },
  fileFilter: fileFilter
});


// Middleware to ensure user is an admin for all routes in this file
router.use(authenticateToken, authorizeRole('admin'));

// --- Get All Novels (for dropdowns, etc.) ---
router.get(
    '/novels/list', // Using a distinct path like /list
    async (req, res) => {
        try {
            const novels = await prisma.novel.findMany({
                select: { id: true, title: true },
                orderBy: { title: 'asc' } // Optional: order alphabetically
            });
            res.json(novels);
        } catch (error) {
            console.error('Error fetching novel list:', error);
            res.status(500).json({ message: 'Internal server error fetching novel list.' });
        }
    }
);


// --- Create Novel ---
router.post(
    '/novels',
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('authorName').optional().trim(),
    body('description').optional().trim(),
    handleValidationErrors,
    async (req, res) => {
        const { title, authorName, description } = req.body;
        try {
            const newNovel = await prisma.novel.create({
                data: { title, authorName, description }
            });
            res.status(201).json(newNovel);
        } catch (error) {
            console.error('Error creating novel:', error);
            // Handle potential unique constraint violation for title
            if (error.code === 'P2002' && error.meta?.target?.includes('title')) {
                return res.status(409).json({ message: 'A novel with this title already exists.' });
            }
            res.status(500).json({ message: 'Internal server error creating novel.' });
        }
    }
);

// --- Create Chapter for a Novel ---
router.post(
    '/novels/:novelId/chapters',
    param('novelId').isInt({ min: 1 }).withMessage('Valid Novel ID is required.').toInt(),
    body('title').optional().trim(), // Make title optional
    body('chapterNumber').isInt({ min: 1 }).withMessage('Chapter number must be a positive integer.').toInt(),
    handleValidationErrors,
    async (req, res) => {
        const { novelId } = req.params;
        const { title, chapterNumber } = req.body;

        try {
            // Check if novel exists
            const novelExists = await prisma.novel.findUnique({ where: { id: novelId } });
            if (!novelExists) {
                return res.status(404).json({ message: 'Novel not found.' });
            }

            const newChapter = await prisma.chapter.create({
                data: {
                    title,
                    chapterNumber,
                    novelId: novelId
                }
            });
            res.status(201).json(newChapter);
        } catch (error) {
            console.error(`Error creating chapter for novel ${novelId}:`, error);
             // Handle potential unique constraint violation for chapter number within a novel
            if (error.code === 'P2002' && error.meta?.target?.includes('novelId') && error.meta?.target?.includes('chapterNumber')) {
                return res.status(409).json({ message: `Chapter number ${chapterNumber} already exists for this novel.` });
            }
            res.status(500).json({ message: 'Internal server error creating chapter.' });
        }
    }
);

// --- Add/Update Chapter Content (Using Novel ID and Chapter Number) ---
router.post(
    // New route structure
    '/novels/:novelId/chapters/:chapterNumber/content',
    param('novelId').isInt({ min: 1 }).withMessage('Valid Novel ID is required.').toInt(),
    param('chapterNumber').isInt({ min: 1 }).withMessage('Valid Chapter Number is required.').toInt(),
    // Validate the incoming segments array
    body('segments').isArray({ min: 1 }).withMessage('Segments array is required and cannot be empty.'),
    body('segments.*.segmentIndex').isInt({ min: 0 }).withMessage('Segment index must be a non-negative integer.'),
    body('segments.*.segmentType').trim().notEmpty().withMessage('Segment type is required.'),
    body('segments.*.textContent').isString().withMessage('Segment text content must be a string.'),
    handleValidationErrors,
    async (req, res) => {
        const { novelId, chapterNumber } = req.params;
        const { segments } = req.body; // Expecting the parsed segments array

        console.log(`Received ${segments.length} segments for Novel ${novelId}, Chapter ${chapterNumber}`);

        try {
            // Find the chapter using novelId and chapterNumber
            const chapter = await prisma.chapter.findUnique({
                where: {
                    novelId_chapterNumber: {
                        novelId: novelId,
                        chapterNumber: chapterNumber
                    }
                },
                select: { id: true } // Only need the ID
            });

            if (!chapter) {
                return res.status(404).json({ message: `Chapter ${chapterNumber} not found for Novel ${novelId}.` });
            }

            const chapterId = chapter.id; // Get the actual chapter ID

            // Map incoming segments to the format needed for Prisma createMany
            const segmentCreateData = segments.map(seg => ({
                chapterId: chapterId, // Use the found chapter ID
                segmentIndex: seg.segmentIndex,
                segmentType: seg.segmentType, // Use the type from the input
                textContent: seg.textContent  // Use the text content from the input
            }));

            await prisma.$transaction([
                // Delete existing segments for this chapter
                prisma.chapterContentSegment.deleteMany({ where: { chapterId: chapterId } }),
                // Create new segments
                prisma.chapterContentSegment.createMany({ data: segmentCreateData })
            ]);

            res.status(200).json({ message: `Content updated successfully for chapter ${chapterId}.` });

        } catch (error) {
            console.error(`Error updating content for chapter ${chapterId}:`, error);
            // Handle potential unique constraint violation for segment index within a chapter
            if (error.code === 'P2002' && error.meta?.target?.includes('chapterId') && error.meta?.target?.includes('segmentIndex')) {
                 return res.status(409).json({ message: `Duplicate segment index found for chapter ${chapterId}. This should not happen if deletion worked.` });
            }
            res.status(500).json({ message: 'Internal server error updating chapter content.' });
        }
    }
);

// --- Get Novels with Chapters (for Management) ---
router.get(
    '/novels/manage',
    async (req, res) => {
        try {
            const novelsWithChapters = await prisma.novel.findMany({
                include: {
                    chapters: {
                        select: { id: true, title: true, chapterNumber: true },
                        orderBy: { chapterNumber: 'asc' }
                    }
                },
                orderBy: { title: 'asc' }
            });
            res.json(novelsWithChapters);
        } catch (error) {
            console.error('Error fetching novels for management:', error);
            res.status(500).json({ message: 'Internal server error fetching novels for management.' });
        }
    }
);

// --- Update Book Cover Image (File Upload) ---
router.put(
    '/books/:bookId/cover',
    param('bookId').isInt({ min: 1 }).withMessage('Valid Book ID is required.').toInt(),
    // Use multer middleware for single file upload named 'coverImage'
    uploadCover.single('coverImage'),
    // No body validation needed here as we get the file path from multer
    async (req, res) => {
        const { bookId } = req.params;

        // Check if a file was actually uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No cover image file uploaded.' });
        }

        // Construct the relative URL path to store in the database
        // req.file.path gives the full system path, we need to make it relative to 'public'
        // Example: backend/public/uploads/covers/1-12345.jpg -> /uploads/covers/1-12345.jpg
        const relativePath = `/uploads/covers/${req.file.filename}`;
        console.log(`File uploaded: ${req.file.filename}, Relative path: ${relativePath}`);

        try {
             // TODO: Optionally delete the OLD cover image file if one existed before updating

            const updatedBook = await prisma.novel.update({
                where: { id: bookId },
                data: { coverImageUrl: relativePath }, // Store the relative path
            });
            res.status(200).json({ message: `Cover image uploaded and updated successfully for book ${bookId}.`, book: updatedBook });
        } catch (error) {
            console.error(`Error updating cover in DB for book ${bookId}:`, error);
            // Handle case where book doesn't exist (P2025)
            if (error.code === 'P2025') {
                 return res.status(404).json({ message: 'Book not found.' });
            }
            res.status(500).json({ message: 'Internal server error updating cover image.' });
        }
    }
);


// --- Delete a Novel ---
router.delete(
    '/novels/:novelId', // Keeping internal API path consistent for now
    param('novelId').isInt({ min: 1 }).withMessage('Valid Novel ID is required.').toInt(),
    handleValidationErrors,
    async (req, res) => {
        const { novelId } = req.params;
        try {
            // Prisma's cascade delete should handle chapters and segments if schema is set up correctly
            await prisma.novel.delete({
                where: { id: novelId }
            });
            res.status(200).json({ message: `Novel ${novelId} deleted successfully.` });
        } catch (error) {
            console.error(`Error deleting novel ${novelId}:`, error);
            // Handle case where novel doesn't exist (P2025)
            if (error.code === 'P2025') {
                 return res.status(404).json({ message: 'Novel not found.' });
            }
            res.status(500).json({ message: 'Internal server error deleting novel.' });
        }
    }
);

// --- Delete a Chapter ---
router.delete(
    '/chapters/:chapterId',
    param('chapterId').isInt({ min: 1 }).withMessage('Valid Chapter ID is required.').toInt(),
    handleValidationErrors,
    async (req, res) => {
        const { chapterId } = req.params;
        try {
            // Prisma's cascade delete should handle segments if schema is set up correctly
            await prisma.chapter.delete({
                where: { id: chapterId }
            });
            res.status(200).json({ message: `Chapter ${chapterId} deleted successfully.` });
        } catch (error) {
            console.error(`Error deleting chapter ${chapterId}:`, error);
             // Handle case where chapter doesn't exist (P2025)
            if (error.code === 'P2025') {
                 return res.status(404).json({ message: 'Chapter not found.' });
            }
            res.status(500).json({ message: 'Internal server error deleting chapter.' });
        }
    }
);


export default router;
