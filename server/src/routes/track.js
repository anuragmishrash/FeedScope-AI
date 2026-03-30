/**
 * Public Tracking Route
 * GET  /api/track/:ticketId — public, no auth
 * POST /api/track/:ticketId/rate — public, no auth, submit satisfaction rating
 */

import express from 'express';
import Feedback from '../models/Feedback.js';

const router = express.Router();

// Fields safe to expose publicly (no email, _id, internal flags)
const PUBLIC_FIELDS = {
    ticketId: 1,
    status: 1,
    sentimentLabel: 1,
    sentimentLevel: 1,
    emotionDetected: 1,
    categoryUserSelected: 1,
    feedbackOriginalText: 1,
    rating: 1,
    createdAt: 1,
    resolvedAt: 1,
    personalizedAIResponse: 1,
    adminResponse: 1,
    satisfactionRating: 1,
    satisfactionSubmitted: 1,
    hasEmoji: 1,
    emojiList: 1,
    name: 1,
    // Explicitly exclude: email, _id, isSpam, isDuplicate, spamReason, hfConfidence, etc.
};

/**
 * @route  GET /api/track/:ticketId
 * @desc   Public tracking — get feedback status by ticket ID
 * @access Public
 */
router.get('/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        if (!ticketId || !ticketId.startsWith('FSC-')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket ID format. Expected FSC-YYYYMMDD-XXXX'
            });
        }

        const feedback = await Feedback.findOne({ ticketId })
            .select(PUBLIC_FIELDS)
            .lean();

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'No ticket found with this ID. Please check and try again.'
            });
        }

        // Remove _id from response even though it's auto-added by lean()
        const { _id, ...safeData } = feedback;

        res.json({ success: true, feedback: safeData });

    } catch (error) {
        console.error('Track GET error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve ticket.' });
    }
});

/**
 * @route  POST /api/track/:ticketId/rate
 * @desc   Public — submit satisfaction rating (1-5, only once)
 * @access Public
 */
router.post('/:ticketId/rate', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { rating } = req.body;

        // Validate rating
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a number between 1 and 5.'
            });
        }

        const feedback = await Feedback.findOne({ ticketId });

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }

        // Only allow rating on Resolved tickets
        if (feedback.status !== 'Resolved' && feedback.status !== 'Closed') {
            return res.status(400).json({
                success: false,
                message: 'Rating is only available after the ticket has been resolved.'
            });
        }

        // Enforce one-time rating
        if (feedback.satisfactionSubmitted) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted a rating for this ticket.'
            });
        }

        feedback.satisfactionRating = rating;
        feedback.satisfactionSubmitted = true;
        await feedback.save();

        res.json({ success: true, message: 'Thank you for your feedback on the resolution!' });

    } catch (error) {
        console.error('Track rate error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit rating.' });
    }
});

export default router;
