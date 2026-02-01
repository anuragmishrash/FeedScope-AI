import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import feedbackRoutes from './routes/feedback.js';
import exportRoutes from './routes/export.js';
import translateRoutes from './routes/translate.js';

// Import utilities
import seedAdmin from './utils/seedAdmin.js';
import { checkSentimentService } from './services/sentimentService.js';
import { swaggerUi, swaggerSpec } from './swagger.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
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
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Seed admin user
        await seedAdmin();

        // Check sentiment service
        const sentimentAvailable = await checkSentimentService();
        if (sentimentAvailable) {
            console.log('✅ Sentiment service is available');
        } else {
            console.warn('⚠️  Sentiment service not available. Please start it separately.');
            console.warn('   Run: cd sentiment-service && python main.py');
        }

        // Start server
        app.listen(PORT, () => {
            console.log(`\n🚀 FeedScope AI Backend running on port ${PORT}`);
            console.log(`   Local: http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`\n📌 API Endpoints:`);
            console.log(`   POST /api/auth/signup`);
            console.log(`   POST /api/auth/login`);
            console.log(`   POST /api/feedback`);
            console.log(`   GET  /api/feedback (admin)`);
            console.log(`\n⚡ Ready to accept requests!\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Start the server
startServer();
