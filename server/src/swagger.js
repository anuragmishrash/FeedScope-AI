import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'FeedScope AI API',
            version: '1.0.0',
            description: 'AI-powered feedback management system with sentiment analysis, emotion detection, and multi-language support',
            contact: {
                name: 'FeedScope AI Team',
                email: 'support@feedscope.ai'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server'
            },
            {
                url: 'https://api.feedscope.ai',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from /api/auth/login'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', example: 'john.doe@example.com' },
                        role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Feedback: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', example: 'john.doe@example.com' },
                        rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
                        feedbackOriginalText: { type: 'string', example: 'Great service!' },
                        feedbackTranslatedText: { type: 'string', nullable: true },
                        language: { type: 'string', enum: ['en', 'hi'], example: 'en' },
                        inputMode: { type: 'string', enum: ['text', 'voice'], example: 'text' },
                        categoryUserSelected: {
                            type: 'string',
                            enum: ['UI/UX Issue', 'Performance Issue', 'Bug Report', 'Feature Request', 'Service Complaint', 'Pricing Concern', 'Other'],
                            example: 'UI/UX Issue'
                        },
                        categoryPredicted: { type: 'string', example: 'UI/UX Issue' },
                        categoryMismatch: { type: 'boolean', example: false },
                        sentimentLabel: { type: 'string', enum: ['Positive', 'Neutral', 'Negative'], example: 'Positive' },
                        sentimentLevel: { type: 'string', enum: ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'], example: 'Positive' },
                        hfSentimentLabel: { type: 'string', example: 'POSITIVE' },
                        hfConfidence: { type: 'number', example: 0.95 },
                        emotionDetected: { type: 'array', items: { type: 'string' }, example: ['Happy', 'Satisfied'] },
                        priority: { type: 'string', enum: ['High', 'Medium', 'Low'], example: 'Medium' },
                        isCritical: { type: 'boolean', example: false },
                        isSpam: { type: 'boolean', example: false },
                        isDuplicate: { type: 'boolean', example: false },
                        spamReason: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['New', 'In Review', 'Resolved', 'Closed'], example: 'New' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error message' }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation successful' }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints'
            },
            {
                name: 'Feedback',
                description: 'Feedback submission and management endpoints'
            },
            {
                name: 'Analytics',
                description: 'Statistics and analytics endpoints'
            },
            {
                name: 'Export',
                description: 'Data export endpoints (CSV, PDF)'
            },
            {
                name: 'Translation',
                description: 'Multi-language translation endpoints'
            }
        ]
    },
    apis: ['./src/routes/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
