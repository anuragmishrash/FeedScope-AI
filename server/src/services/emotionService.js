/**
 * Emotion keyword sets for detection
 */
const emotionKeywords = {
    angry: ['worst', 'unacceptable', 'hate', 'terrible', 'awful', 'horrible', 'furious', 'outraged', 'disgusting', 'pathetic', 'ridiculous'],
    frustrated: ['slow', 'again', 'still', 'waiting', 'delay', 'buggy', 'frustrated', 'annoying', 'irritating', 'broken', 'issue', 'problem', 'bug', 'error', 'not working', 'fail'],
    confused: ['confusing', 'not sure', 'unclear', 'dont understand', "don't understand", 'complicated', 'help', 'lost', 'stuck', 'confused'],
    happy: ['amazing', 'excellent', 'love', 'perfect', 'fantastic', 'awesome', 'wonderful', 'best', 'great'],
    satisfied: ['good', 'nice', 'fine', 'works well', 'helpful', 'useful', 'recommend', 'smooth', 'easy', 'simple']
};

/**
 * Detect single primary emotion from feedback text
 * Returns one emotion based on keyword priority and sentiment
 * 
 * @param {string} text - Feedback text
 * @param {string} sentimentLevel - Sentiment level (Very Positive, Positive, Neutral, Negative, Very Negative)
 * @returns {string} - Single emotion (Angry, Frustrated, Confused, Happy, Satisfied, or Neutral)
 */
export const detectEmotion = (text, sentimentLevel) => {
    const lowerText = text.toLowerCase();

    // Priority order: Check emotions from strongest to weakest
    // Angry has highest priority for negative feedback
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        if (keywords.some(word => lowerText.includes(word))) {
            // Capitalize first letter and return
            return emotion.charAt(0).toUpperCase() + emotion.slice(1);
        }
    }

    // No keywords found - fallback based on sentiment level
    if (sentimentLevel.includes('Negative')) {
        return 'Frustrated';
    }

    if (sentimentLevel.includes('Positive')) {
        return 'Satisfied';
    }

    return 'Neutral';
};

/**
 * Legacy function for backward compatibility
 * Returns array with single emotion for existing code
 * 
 * @deprecated Use detectEmotion() instead
 */
export const detectEmotions = (text, sentimentLabel) => {
    const emotion = detectEmotion(text, sentimentLabel);
    return [emotion];
};
