import Feedback from '../models/Feedback.js';
import stringSimilarity from 'string-similarity';

/**
 * Check if feedback is spam based on submission rate
 */
export const checkSpam = async (email) => {
    if (!email) return { isSpam: false };

    try {
        // Check submissions in last 1 minute
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

        const recentCount = await Feedback.countDocuments({
            email: email,
            createdAt: { $gte: oneMinuteAgo }
        });

        // If more than 3 submissions in 1 minute, mark as spam
        if (recentCount >= 3) {
            return {
                isSpam: true,
                spamReason: 'Too many submissions from same email in short time'
            };
        }

        return { isSpam: false };

    } catch (error) {
        console.error('Spam check error:', error);
        return { isSpam: false };
    }
};

/**
 * Check if feedback text is duplicate
 */
export const checkDuplicate = async (text, email) => {
    try {
        // Get recent feedback from same email or all recent feedback
        const query = email ? { email } : {};
        const recentFeedback = await Feedback.find(query)
            .select('feedbackOriginalText')
            .sort({ createdAt: -1 })
            .limit(50);

        if (recentFeedback.length === 0) {
            return { isDuplicate: false };
        }

        // Check similarity with recent feedback
        for (const feedback of recentFeedback) {
            if (!feedback.feedbackOriginalText) continue; // guard against missing field
            const similarity = stringSimilarity.compareTwoStrings(
                text.toLowerCase(),
                feedback.feedbackOriginalText.toLowerCase()
            );

            // If similarity > 90%, mark as duplicate
            if (similarity > 0.90) {
                return {
                    isDuplicate: true,
                    spamReason: 'Very similar to recent feedback'
                };
            }
        }

        return { isDuplicate: false };

    } catch (error) {
        console.error('Duplicate check error:', error);
        return { isDuplicate: false };
    }
};
