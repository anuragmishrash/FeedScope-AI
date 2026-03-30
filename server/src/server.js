import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import feedbackRoutes from './routes/feedback.js';
import trackRoutes from './routes/track.js';
import exportRoutes from './routes/export.js';
import translateRoutes from './routes/translate.js';

// Import utilities
import seedAdmin from './utils/seedAdmin.js';
import { checkSentimentService } from './services/sentimentService.js';
import { swaggerUi, swaggerSpec } from './swagger.js';
import Feedback from './models/Feedback.js';

// Load environment variables
dotenv.config();

// Initialize Express app + HTTP server
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ── Socket.io setup ──────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

// Expose io to routes via app context
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Admin joins a dedicated room to receive feedback events
    socket.on('join:admin', () => {
        socket.join('admin-room');
        console.log(`[Socket.io] Admin joined admin-room: ${socket.id}`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/translate', translateRoutes);

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'FeedScope AI API Docs'
}));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        socketio: io.engine.clientsCount + ' client(s) connected'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'FeedScope AI Backend API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            feedback: '/api/feedback',
            export: '/api/export',
            health: '/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// ── Connect to MongoDB + start server ────────────────────────────────────────
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Recover stale tickets
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const result = await Feedback.updateMany(
                { status: 'New', createdAt: { $lt: tenMinutesAgo } },
                { $set: { status: 'In Review' } }
            );
            if (result.modifiedCount > 0) {
                console.log(`[Startup] Auto-advanced ${result.modifiedCount} stale ticket(s) to In Review`);
            }
        } catch (err) {
            console.error('[Startup] recoverStaleTickets failed:', err.message);
        }

        await seedAdmin();

        const sentimentAvailable = await checkSentimentService();
        if (sentimentAvailable) {
            console.log('✅ Sentiment service is available');
        } else {
            console.warn('⚠️  Sentiment service not available. Please start it separately.');
            console.warn('   Run: cd sentiment-service && python main.py');
        }

        // ── IMPORTANT: Use httpServer.listen (not app.listen) for Socket.io ──
        httpServer.listen(PORT, () => {
            console.log(`\n🚀 FeedScope AI Backend running on port ${PORT}`);
            console.log(`   Local:  http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   Socket.io: enabled (admin-room)`);
            console.log(`\n📌 API Endpoints:`);
            console.log(`   POST /api/auth/signup`);
            console.log(`   POST /api/auth/login`);
            console.log(`   POST /api/feedback`);
            console.log(`   POST /api/feedback/summary  [AI]`);
            console.log(`   GET  /api/feedback (admin)`);
            console.log(`\n⚡ Ready to accept requests!\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

startServer();

export { io };
