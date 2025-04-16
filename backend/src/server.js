import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes.js'; // Import auth routes
import contentRoutes from './routes/content.routes.js';
import interactionRoutes from './routes/interaction.routes.js';
import blogRoutes from './routes/blog.routes.js';
import progressRoutes from './routes/progress.routes.js'; // Import progress routes
import adminRoutes from './routes/admin.routes.js'; // Import admin routes
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath for ES Modules

// Load environment variables from .env file
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create Express app
const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies

// --- Static File Serving ---
// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve files from the 'public' directory
app.use('/public', express.static(path.join(__dirname, '..', 'public'))); // Serve /public route from ../public folder relative to src
console.log(`Serving static files from: ${path.join(__dirname, '..', 'public')}`);


// Basic route
app.get('/', (req, res) => {
  res.send('Kweezy App Backend API is running!');
});

// --- API Routes ---
app.use('/api/auth', authRoutes); // Use auth routes with /api/auth prefix
app.use('/api/content', contentRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/progress', progressRoutes); // Mount progress routes
app.use('/api/admin', adminRoutes); // Mount admin routes

// Start the server
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Listen on all available network interfaces

const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect(); // Disconnect Prisma Client
    console.log('Prisma Client disconnected');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect(); // Disconnect Prisma Client
    console.log('Prisma Client disconnected');
    process.exit(0);
  });
});

// Export prisma instance for use in route files (optional, depends on structure)
// export { prisma }; // We might structure routes differently later
