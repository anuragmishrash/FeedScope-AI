/**
 * Emotion Validator — Bug 1 Fix
 * Ensures the detected emotion is logically consistent with the final sentiment.
 *
 * Prevents impossible results like "Satisfied" emotion on "Very Negative" feedback.
 */

const NEGATIVE_LEVELS = new Set(['negative', 'very negative']);
const POSITIVE_LEVELS = new Set(['very positive', 'positive']);

// Emotions valid for each sentiment direction
const VALID_FOR_NEGATIVE = new Set(['angry', 'frustrated', 'confused']);
const VALID_FOR_POSITIVE = new Set(['happy', 'satisfied']);

/**
 * Validate and correct emotion against final sentiment level.
 * @param {string} detectedEmotion - e.g. 'Satisfied', 'Angry'
 * @param {string} finalSentimentLevel - e.g. 'Very Negative', 'Positive', 'Neutral'
 * @returns {string} - Validated (and potentially corrected) capitalized emotion
 */
const validateEmotion = (detectedEmotion, finalSentimentLevel) => {
    const emotion = (detectedEmotion || 'Satisfied').toLowerCase();
    const level = (finalSentimentLevel || 'Neutral').toLowerCase();

    // Negative/Very Negative sentiment → must be a negative emotion
    if (NEGATIVE_LEVELS.has(level)) {
        if (!VALID_FOR_NEGATIVE.has(emotion)) {
            // Override happy/satisfied with frustrated (default negative emotion)
            return 'Frustrated';
        }
        return capitalize(emotion);
    }

    // Positive/Very Positive sentiment → must be a positive emotion
    if (POSITIVE_LEVELS.has(level)) {
        if (!VALID_FOR_POSITIVE.has(emotion)) {
            // Override angry/frustrated with satisfied for positive feedback
            // Using 'Confused' only if emotion was 'confused' (genuinely uncertain)
            return emotion === 'confused' ? 'Confused' : 'Satisfied';
        }
        return capitalize(emotion);
    }

    // Neutral sentiment — any emotion is acceptable
    return capitalize(emotion);
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export { validateEmotion };
