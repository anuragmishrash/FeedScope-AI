import express from 'express';
import Joi from 'joi';
import Feedback from '../models/Feedback.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { analyzeSentiment, getCacheStats, clearSentimentCache } from '../services/sentimentService.js';
import { translateToEnglish } from '../services/translationService.js';
import { detectEmotions } from '../services/emotionService.js';
import { predictCategory, checkCategoryMismatch } from '../services/categoryService.js';
import { checkSpam, checkDuplicate } from '../services/spamService.js';
import { analyzeEmojis } from '../utils/emojiDetector.js';
import { blendSentiment } from '../services/sentimentBlender.js';
import { validateEmotion } from '../utils/emotionValidator.js';
import { generateSuggestedResponse } from '../services/responseSuggestionService.js';
import { generateUniqueTicketId } from '../utils/ticketIdGenerator.js';
import { generatePersonalizedResponse } from '../services/personalizedResponseService.js';
import STATUS from '../utils/statusConstants.js';
import { generateFeedbackSummary } from '../services/aiSummaryService.js';
import SummaryCache from '../models/SummaryCache.js';

const router = express.Router();

// Track in-progress AI summaries to prevent simultaneous duplicate gemini API calls
const inProgressSummaries = new Set();

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
router.post('/', optionalAuth, async (req, res) => {
    try {
        // ── Step 1: Validate input ─────────────────────────────────────────
        const { error, value } = feedbackSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });
        const { name, email, rating, feedbackText, category, language, inputMode } = value;

        // ── Step 2: Spam + Duplicate detection ────────────────────────────
        const spamCheck = await checkSpam(email);
        const duplicateCheck = await checkDuplicate(feedbackText, email);

        // ── Step 3: Translate if Hindi ────────────────────────────────────
        let translatedText = feedbackText;
        if (language === 'hi') {
            translatedText = await translateToEnglish(feedbackText, 'hi');
        }

        // ── Step 4: DistilBERT → 5-level sentiment (50% threshold) ───────
        const sentimentAnalysis = await analyzeSentiment(translatedText);

        // ── Step 5: Emoji analysis on original text ───────────────────────
        const emojiAnalysis = analyzeEmojis(feedbackText);

        // ── Step 6: Sentiment blending (smart — only shifts on conflict) ──
        const blendResult = blendSentiment(
            sentimentAnalysis.sentimentLevel,
            emojiAnalysis.dominantEmojiSentiment
        );
        const finalSentimentLevel = blendResult.finalSentimentLevel;
        const finalSentimentLabel = blendResult.finalSentimentLabel;
        const sentimentConflict = blendResult.sentimentConflict;

        // ── Step 7: Emotion detection (expanded keywords, scoring) ────────
        const rawEmotions = detectEmotions(translatedText, finalSentimentLevel);

        // ── Step 8: Validate emotion against final sentiment ──────────────
        const validatedEmotion = validateEmotion(rawEmotions[0], finalSentimentLevel);
        const emotions = [validatedEmotion];

        // ── Category prediction ───────────────────────────────────────────
        const categoryPred = predictCategory(translatedText);
        const isMismatch = checkCategoryMismatch(category, categoryPred);

        // ── Priority & critical flag ──────────────────────────────────────
        let priority = 'Medium';
        let isCritical = false;
        if (
            finalSentimentLevel === 'Very Negative' ||
            emotions.includes('Angry') ||
            emotions.includes('Frustrated') ||
            rating <= 2 ||
            (emojiAnalysis.dominantEmojiSentiment === 'negative' && finalSentimentLabel === 'Negative')
        ) {
            priority = 'High';
            isCritical = true;
        } else if (finalSentimentLabel === 'Positive') {
            priority = 'Low';
        }

        // ── Step 9: Generate suggested response (legacy) + personalized AI response ──
        const suggestedResponse = generateSuggestedResponse({
            sentimentLevel: finalSentimentLevel,
            emotionDetected: emotions,
            categoryUserSelected: category,
            feedbackText: translatedText
        });

        const personalizedAIResponse = generatePersonalizedResponse(
            translatedText,
            finalSentimentLevel,
            emotions[0] || 'Satisfied',
            category
        );

        // ── Step 10: Generate unique ticket ID ────────────────────────────────
        const ticketId = await generateUniqueTicketId(Feedback);

        // ── Step 11: Save to MongoDB ──────────────────────────────────────────
        const feedback = new Feedback({
            name: req.user ? req.user.name : (name || 'Anonymous'),
            email: req.user ? req.user.email : (email || null),
            // User identity snapshot
            userId: req.user ? req.user._id : null,
            userName: req.user ? req.user.name : null,
            userEmail: req.user ? req.user.email : null,
            rating,
            feedbackOriginalText: feedbackText,
            feedbackTranslatedText: language === 'hi' ? translatedText : null,
            language,
            inputMode,
            categoryUserSelected: category,
            categoryPredicted: categoryPred,
            categoryMismatch: isMismatch,
            sentimentLabel: finalSentimentLabel,
            sentimentLevel: finalSentimentLevel,
            hfSentimentLabel: sentimentAnalysis.hfSentimentLabel,
            hfConfidence: sentimentAnalysis.hfConfidence,
            sentimentConfidence: sentimentAnalysis.sentimentConfidence ?? 0,
            emotionDetected: emotions,
            priority,
            isCritical,
            isSpam: spamCheck.isSpam,
            isDuplicate: duplicateCheck.isDuplicate,
            spamReason: spamCheck.spamReason || duplicateCheck.spamReason || null,
            status: STATUS.NEW,
            hasEmoji: emojiAnalysis.hasEmoji,
            emojiList: emojiAnalysis.emojiList,
            dominantEmojiSentiment: emojiAnalysis.dominantEmojiSentiment,
            suggestedResponse,
            personalizedAIResponse,
            ticketId,
            sentimentConflict
        });

        await feedback.save();
        const savedId = feedback._id;

        // ── Step 11b: Emit real-time event to admin dashboard ─────────────────
        try {
            const io = req.app.get('io');
            if (io) {
                // Run stat queries in parallel — non-blocking
                const [totalCount, criticalCount, avgRatingResult] = await Promise.all([
                    Feedback.countDocuments(),
                    Feedback.countDocuments({ isCritical: true }),
                    Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }])
                ]);

                io.to('admin-room').emit('feedback:new', {
                    feedback: {
                        _id: feedback._id,
                        ticketId: feedback.ticketId,
                        feedbackOriginalText: feedback.feedbackOriginalText,
                        sentimentLabel: feedback.sentimentLabel,
                        sentimentLevel: feedback.sentimentLevel,
                        emotionDetected: feedback.emotionDetected,
                        categoryUserSelected: feedback.categoryUserSelected,
                        priority: feedback.priority,
                        isCritical: feedback.isCritical,
                        status: feedback.status,
                        createdAt: feedback.createdAt,
                        userName: feedback.userName,
                        userEmail: feedback.userEmail,
                        hasEmoji: feedback.hasEmoji,
                        rating: feedback.rating,
                        personalizedAIResponse: feedback.personalizedAIResponse,
                        suggestedResponse: feedback.suggestedResponse,
                    },
                    stats: {
                        totalCount,
                        criticalCount,
                        avgRating: avgRatingResult[0]?.avg?.toFixed(1) || '0.0',
                    }
                });
            }
        } catch (socketErr) {
            // Non-critical — never let socket errors break the response
            console.error('[Socket.io] Emit error:', socketErr.message);
        }

        // ── Step 12: Schedule auto-advance to 'In Review' after 10 minutes ───
        setTimeout(async () => {
            try {
                await Feedback.findOneAndUpdate(
                    { _id: savedId, status: STATUS.NEW },
                    { $set: { status: STATUS.IN_REVIEW } }
                );
                console.log(`[AutoProgress] Ticket ${ticketId} → In Review`);
            } catch (err) {
                // Silent fail — non-critical background task
            }
        }, 10 * 60 * 1000);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback: {
                id: feedback._id,
                ticketId: feedback.ticketId,
                sentimentLabel: feedback.sentimentLabel,
                sentimentLevel: feedback.sentimentLevel,
                emotionDetected: feedback.emotionDetected,
                sentimentConflict: feedback.sentimentConflict
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
 * @route   GET /api/feedback/my
 * @desc    Get all feedbacks submitted by the logged-in user
 * @access  Private (authenticated users only)
 */
router.get('/my', authenticate, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .select('ticketId status sentimentLabel sentimentLevel emotionDetected categoryUserSelected feedbackOriginalText createdAt personalizedAIResponse adminResponse resolvedAt satisfactionRating satisfactionSubmitted priority hasEmoji')
            .lean();

        res.json({ success: true, feedbacks });
    } catch (error) {
        console.error('My feedbacks error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your feedbacks.' });
    }
});

/**
 * @route   POST /api/feedback/claim
 * @desc    Link an anonymous ticket to a logged-in user's account
 * @access  Private (authenticated users only)
 */
router.post('/claim', authenticate, async (req, res) => {
    try {
        const { ticketId } = req.body;
        if (!ticketId) {
            return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
        }

        const feedback = await Feedback.findOne({ ticketId: ticketId.trim().toUpperCase() });

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Ticket not found. Please check the ID and try again.' });
        }

        if (feedback.userId) {
            return res.status(409).json({ success: false, message: 'This ticket is already linked to an account.' });
        }

        // Link to current user
        feedback.userId = req.user._id;
        feedback.userName = req.user.name;
        feedback.userEmail = req.user.email;
        await feedback.save();

        // Emit real-time update to admin dashboard
        try {
            const io = req.app.get('io');
            if (io) {
                io.to('admin-room').emit('feedback:updated', {
                    _id: feedback._id,
                    ticketId: feedback.ticketId,
                    userId: feedback.userId,
                    userName: feedback.userName,
                    userEmail: feedback.userEmail
                });
            }
        } catch (socketErr) {
            console.error('[Socket.io] Emit error on claim:', socketErr.message);
        }

        res.json({ success: true, message: 'Feedback linked to your account successfully!', feedback });
    } catch (error) {
        console.error('Claim ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to claim ticket. Please try again.' });
    }
});

/**
 * @route   POST /api/feedback/summary
 * @desc    Generate AI-powered feedback summary for a date range
 * @access  Private (Admin only)
 */
const getDateFilter = (dateRange, startDate, endDate) => {
    const now = new Date();
    switch (dateRange) {
        case 'today':
            return { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } };
        case 'week':
            return { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        case 'month':
            return { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        case 'custom':
            if (!startDate || !endDate) throw new Error('startDate and endDate are required for custom range');
            if (new Date(startDate) > new Date(endDate)) throw new Error('startDate cannot be after endDate');
            return { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
        default:
            return { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    }
};

const DATE_RANGE_LABELS = {
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    custom: 'Custom Range',
};

router.post('/summary', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { dateRange = 'week', startDate, endDate, forceRefresh = false } = req.body;

        // Build a unique cache key for this period
        let periodKey;
        if (dateRange === 'custom' && startDate && endDate) {
            // Normalize dates to date-only strings to avoid time-based cache misses
            const start = new Date(startDate).toISOString().split('T')[0];
            const end = new Date(endDate).toISOString().split('T')[0];
            periodKey = `custom:${start}:${end}`;
        } else {
            periodKey = dateRange;
        }

        // STEP 1 — Check cache (unless forceRefresh is requested)
        if (!forceRefresh) {
            const cached = await SummaryCache.findOne({
                periodKey,
                expiresAt: { $gt: new Date() }, // only return non-expired cache
            }).lean();

            if (cached) {
                console.log(`[Summary Cache] HIT for period: ${periodKey}`);
                const currentFeedbackCount = await Feedback.countDocuments();
                return res.status(200).json({
                    success: true,
                    summary: cached.summary,
                    feedbackCount: cached.feedbackCount,
                    currentFeedbackCount,
                    dateRange,
                    generatedAt: cached.generatedAt,
                    fromCache: true,
                    expiresAt: cached.expiresAt,
                });
            }
            console.log(`[Summary Cache] MISS for period: ${periodKey} — calling Gemini`);
        } else {
            console.log(`[Summary Cache] Force refresh requested for period: ${periodKey}`);
            // Delete existing cache for this period so we can replace it safely
            await SummaryCache.deleteOne({ periodKey });
        }

        // STEP 2 — Cache miss or force refresh — fetch feedbacks from DB
        let dateFilter;
        try {
            dateFilter = getDateFilter(dateRange, startDate, endDate);
        } catch (filterErr) {
            return res.status(400).json({ success: false, message: filterErr.message });
        }

        // Prevent duplicate simultaneous AI requests for the same date range
        if (inProgressSummaries.has(periodKey)) {
            return res.status(429).json({ 
                success: false, 
                message: 'A summary for this period is currently generating. Please wait a moment for it to complete and try again.',
                retryAfter: 5
            });
        }

        const feedbacks = await Feedback.find(dateFilter)
            .sort({ createdAt: -1 })
            .limit(50)  // Stay within free model token limits
            .select('feedbackOriginalText sentimentLabel sentimentLevel emotionDetected categoryUserSelected createdAt')
            .lean();

        if (feedbacks.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No feedback found for this period. Try a wider date range.'
            });
        }

        const dateRangeLabel = DATE_RANGE_LABELS[dateRange] || 'Selected Period';
        inProgressSummaries.add(periodKey);

        try {
            // STEP 3 — Call Gemini
            const summary = await generateFeedbackSummary(feedbacks, dateRangeLabel);

            // STEP 4 — Save to MongoDB Cache
            const CACHE_DURATION_MS = dateRange === 'custom'
                ? 24 * 60 * 60 * 1000  // 24 hours for historical ranges
                : 60 * 60 * 1000;      // 1 hour for today/week/month

            const expiresAt = new Date(Date.now() + CACHE_DURATION_MS);

            await SummaryCache.create({
                period: dateRange,
                periodKey,
                summary,
                feedbackCount: feedbacks.length,
                generatedAt: new Date(),
                expiresAt,
            });

            console.log(`[Summary Cache] Saved cache for ${periodKey}, expires at ${expiresAt.toISOString()}`);

            return res.status(200).json({
                success: true,
                summary,
                feedbackCount: feedbacks.length,
                currentFeedbackCount: feedbacks.length,  // equal since just generated
                dateRange: dateRangeLabel,
                generatedAt: new Date(),
                fromCache: false,
                expiresAt,
            });
        } finally {
            inProgressSummaries.delete(periodKey);
        }

    } catch (err) {
        console.error('[Summary Route] Error:', err.message);

        if (err.message === 'RATE_LIMIT_EXHAUSTED' || err.message?.includes('rate limit') || err.message?.includes('permanently')) {
            return res.status(429).json({
                success: false,
                message: 'Gemini rate limit exhausted. Please wait a minute and try again.',
                retryAfter: 60,
            });
        }
        if (err.message?.includes('API key') || err.message?.includes('Invalid Gemini')) {
            return res.status(500).json({ success: false, message: 'AI service configuration error.' });
        }
        return res.status(503).json({
            success: false,
            message: err.message || 'AI service temporarily unavailable. Try again.'
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
            isSpam = '',
            hasEmoji = '',
            userType = ''
        } = req.query;

        // Build query
        const query = {};

        // Search in feedback text or email
        if (search) {
            query.$or = [
                { feedbackOriginalText: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by user type (registered vs guest)
        if (userType === 'registered') {
            query.userId = { $ne: null };
        } else if (userType === 'guest') {
            query.userId = null;
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

        // Filter by emoji presence (Feature 2)
        if (hasEmoji === 'true') {
            query.hasEmoji = true;
        } else if (hasEmoji === 'false') {
            query.hasEmoji = { $ne: true };
        }

        // Execute query with pagination
        const feedbacks = await Feedback.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Feedback.countDocuments(query);

        res.json({
            success: true,
            feedback: feedbacks, // Changed from 'feedbacks' to 'feedback'
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

        // Format sentiment breakdown for frontend
        const sentimentBreakdown = {};
        sentimentCounts.forEach(item => {
            sentimentBreakdown[item._id] = item.count;
        });

        // Emoji feedback count (Feature 3 KPI)
        const emojiCount = await Feedback.countDocuments({ hasEmoji: true });

        // AI suggestions count (Feature 3 KPI)
        const aiSuggestionsCount = await Feedback.countDocuments({ suggestedResponse: { $exists: true, $ne: null } });

        // Emoji sentiment breakdown for mini chart
        const emojiSentimentRaw = await Feedback.aggregate([
            { $match: { hasEmoji: true, dominantEmojiSentiment: { $ne: null } } },
            { $group: { _id: '$dominantEmojiSentiment', count: { $sum: 1 } } }
        ]);
        const emojiSentimentBreakdown = {};
        emojiSentimentRaw.forEach(item => {
            emojiSentimentBreakdown[item._id] = item.count;
        });

        res.json({
            success: true,
            stats: {
                totalFeedback: total,
                criticalCount,
                averageRating: parseFloat(avgRating.toFixed(2)),
                sentimentBreakdown,
                sentiment: sentimentCounts,
                category: categoryCounts,
                status: statusCounts,
                emotions,
                emojiCount,
                aiSuggestionsCount,
                emojiSentimentBreakdown
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
        const { days = 30 } = req.query; // Increased default to 30 days to capture more data

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // First, check if we have any data at all
        const totalCount = await Feedback.countDocuments();
        console.log('Total feedback count:', totalCount);

        const trendsRaw = await Feedback.aggregate([
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

        console.log('Trends raw data:', trendsRaw); // Debug log

        // If no data in date range, get all data
        let finalTrendsRaw = trendsRaw;
        if (trendsRaw.length === 0 && totalCount > 0) {
            console.log('No data in date range, fetching all data...');
            finalTrendsRaw = await Feedback.aggregate([
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
            console.log('All trends data:', finalTrendsRaw);
        }

        // Transform trends data to match frontend expectations
        // Frontend expects: [{ _id: 'date', positive: count, negative: count, neutral: count }]
        const trendsMap = {};
        finalTrendsRaw.forEach(item => {
            const date = item._id.date;
            const sentiment = item._id.sentiment ? item._id.sentiment.toLowerCase() : 'neutral';
            
            if (!trendsMap[date]) {
                trendsMap[date] = { _id: date, positive: 0, negative: 0, neutral: 0 };
            }
            
            trendsMap[date][sentiment] = item.count;
        });

        const trends = Object.values(trendsMap);
        console.log('Trends formatted data:', trends); // Debug log

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

/**
 * @route   PATCH /api/feedback/:id/view
 * @desc    Admin opens a feedback modal — silently advance status to 'Being Resolved'
 *          Only advances if status is New or In Review. Never goes backwards.
 * @access  Private (Admin)
 */
router.patch('/:id/view', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

        // Only advance forward — never downgrade
        if (feedback.status === STATUS.NEW || feedback.status === STATUS.IN_REVIEW) {
            feedback.status = STATUS.BEING_RESOLVED;
            await feedback.save();
        }

        res.json({ success: true, feedback });
    } catch (error) {
        console.error('View status update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
});

/**
 * @route   PATCH /api/feedback/:id/resolve
 * @desc    Admin saves resolution response and marks ticket as Resolved
 * @access  Private (Admin)
 */
router.patch('/:id/resolve', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { adminResponse } = req.body;

        if (!adminResponse || adminResponse.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Resolution response is required.' });
        }

        if (adminResponse.length > 500) {
            return res.status(400).json({ success: false, message: 'Response must be 500 characters or fewer.' });
        }

        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    adminResponse: adminResponse.trim(),
                    status: STATUS.RESOLVED,
                    resolvedAt: new Date()
                }
            },
            { new: true }
        );

        if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

        res.json({ success: true, feedback });
    } catch (error) {
        console.error('Resolve error:', error);
        res.status(500).json({ success: false, message: 'Failed to resolve ticket.' });
    }
});

export default router;

