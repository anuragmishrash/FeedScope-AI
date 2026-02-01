import express from 'express';
import Joi from 'joi';
import Feedback from '../models/Feedback.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { analyzeSentiment, getCacheStats, clearSentimentCache } from '../services/sentimentService.js';
import { translateToEnglish } from '../services/translationService.js';
import { detectEmotions } from '../services/emotionService.js';
import { predictCategory, checkCategoryMismatch } from '../services/categoryService.js';
import { checkSpam, checkDuplicate } from '../services/spamService.js';

const router = express.Router();

// Validation schema for feedback submission
const feedbackSchema = Joi.object({
    name: Joi.string().max(100).allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    rating: Joi.number().min(1).max(5).required(),
    feedbackText: Joi.string().min(10).max(2000).required(),
    category: Joi.string().valid(
        'UI/UX Issue',
        'Performance Issue',
        'Bug Report',
        'Feature Request',
        'Service Complaint',
        'Pricing Concern',
        'Other'
    ).required(),
    language: Joi.string().valid('en', 'hi').default('en'),
    inputMode: Joi.string().valid('text', 'voice').default('text')
});

/**
 * @route   POST /api/feedback
 * @desc    Submit feedback (user or anonymous)
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        // Validate input
        const { error, value } = feedbackSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { name, email, rating, feedbackText, category, language, inputMode } = value;

        // Check for spam
        const spamCheck = await checkSpam(email);

        // Check for duplicates
        const duplicateCheck = await checkDuplicate(feedbackText, email);

        // Translate if Hindi
        let translatedText = feedbackText;
        if (language === 'hi') {
            translatedText = await translateToEnglish(feedbackText, 'hi');
        }

        // Analyze sentiment using HuggingFace
        const sentimentAnalysis = await analyzeSentiment(translatedText);

        // Detect emotions
        const emotions = detectEmotions(translatedText, sentimentAnalysis.sentimentLevel);

        // Predict category
        const categoryPred = predictCategory(translatedText);
        const isMismatch = checkCategoryMismatch(category, categoryPred);

        // Determine priority and critical flag
        let priority = 'Medium';
        let isCritical = false;

        if (
            sentimentAnalysis.sentimentLevel === 'Very Negative' ||
            emotions.includes('Angry') ||
            emotions.includes('Frustrated') ||
            rating <= 2
        ) {
            priority = 'High';
            isCritical = true;
        } else if (sentimentAnalysis.sentimentLabel === 'Positive') {
            priority = 'Low';
        }

        // Create feedback document
        const feedback = new Feedback({
            name: name || 'Anonymous',
            email: email || null,
            rating,
            feedbackOriginalText: feedbackText,
            feedbackTranslatedText: language === 'hi' ? translatedText : null,
            language,
            inputMode,
            categoryUserSelected: category,
            categoryPredicted: categoryPred,
            categoryMismatch: isMismatch,
            sentimentLabel: sentimentAnalysis.sentimentLabel,
            sentimentLevel: sentimentAnalysis.sentimentLevel,
            hfSentimentLabel: sentimentAnalysis.hfSentimentLabel,
            hfConfidence: sentimentAnalysis.hfConfidence,
            emotionDetected: emotions,
            priority,
            isCritical,
            isSpam: spamCheck.isSpam,
            isDuplicate: duplicateCheck.isDuplicate,
            spamReason: spamCheck.spamReason || duplicateCheck.spamReason || null,
            status: 'New'
        });

        await feedback.save();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback: {
                id: feedback._id,
                sentimentLabel: feedback.sentimentLabel,
                sentimentLevel: feedback.sentimentLevel,
                emotionDetected: feedback.emotionDetected
            }
        });

    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback. Please try again.'
        });
    }
});

/**
 * @route   GET /api/feedback
 * @desc    Get all feedback with filters (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            sentiment = '',
            category = '',
            rating = '',
            priority = '',
            status = '',
            language = '',
            inputMode = '',
            startDate = '',
            endDate = '',
            isCritical = '',
            isSpam = ''
        } = req.query;

        // Build query
        const query = {};

        // Search in feedback text or email
        if (search) {
            query.$or = [
                { feedbackOriginalText: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by sentiment
        if (sentiment) {
            query.sentimentLabel = sentiment;
        }

        // Filter by category
        if (category) {
            query.categoryUserSelected = category;
        }

        // Filter by rating
        if (rating) {
            query.rating = parseInt(rating);
        }

        // Filter by priority
        if (priority) {
            query.priority = priority;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by language
        if (language) {
            query.language = language;
        }

        // Filter by input mode
        if (inputMode) {
            query.inputMode = inputMode;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Filter by critical flag
        if (isCritical === 'true') {
            query.isCritical = true;
        }

        // Filter by spam flag
        if (isSpam === 'true') {
            query.isSpam = true;
        } else if (isSpam === 'false') {
            query.isSpam = false;
        }

        // Execute query with pagination
        const feedbacks = await Feedback.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Feedback.countDocuments(query);

        res.json({
            success: true,
            feedbacks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback'
        });
    }
});

/**
 * @route   GET /api/feedback/stats
 * @desc    Get feedback statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const total = await Feedback.countDocuments();

        // Sentiment distribution
        const sentimentCounts = await Feedback.aggregate([
            {
                $group: {
                    _id: '$sentimentLabel',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Category distribution
        const categoryCounts = await Feedback.aggregate([
            {
                $group: {
                    _id: '$categoryUserSelected',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Critical count
        const criticalCount = await Feedback.countDocuments({ isCritical: true });

        // Average rating
        const avgRatingResult = await Feedback.aggregate([
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);
        const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

        // Status distribution
        const statusCounts = await Feedback.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Emotion distribution
        const emotions = await Feedback.aggregate([
            {
                $unwind: '$emotionDetected'
            },
            {
                $group: {
                    _id: '$emotionDetected',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            stats: {
                total,
                criticalCount,
                avgRating: avgRating.toFixed(2),
                sentiment: sentimentCounts,
                category: categoryCounts,
                status: statusCounts,
                emotions
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

/**
 * @route   GET /api/feedback/trends
 * @desc    Get sentiment trends over time (admin only)
 * @access  Private (Admin)
 */
router.get('/trends', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const trends = await Feedback.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        sentiment: '$sentimentLabel'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.date': 1 }
            }
        ]);

        res.json({
            success: true,
            trends
        });

    } catch (error) {
        console.error('Get trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trends'
        });
    }
});

/**
 * @route   PATCH /api/feedback/:id/status
 * @desc    Update feedback status (admin only)
 * @access  Private (Admin)
 */
router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { status } = req.body;

        if (!['New', 'In Review', 'Resolved', 'Closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true }
        );

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            feedback
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

/**
 * @route   DELETE /api/feedback/:id
 * @desc    Delete feedback (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndDelete(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        res.json({
            success: true,
            message: 'Feedback deleted successfully'
        });

    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete feedback'
        });
    }
});

/**
 * @route   GET /api/feedback/cache-stats
 * @desc    Get sentiment cache statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/cache-stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const stats = getCacheStats();

        res.json({
            success: true,
            cacheStats: stats
        });

    } catch (error) {
        console.error('Get cache stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cache statistics'
        });
    }
});

/**
 * @route   POST /api/feedback/cache-clear
 * @desc    Clear sentiment cache (admin only)
 * @access  Private (Admin)
 */
router.post('/cache-clear', authenticate, requireRole('admin'), async (req, res) => {
    try {
        clearSentimentCache();

        res.json({
            success: true,
            message: 'Sentiment cache cleared successfully'
        });

    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache'
        });
    }
});

export default router;
