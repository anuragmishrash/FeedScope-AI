/**
 * Sentiment Blender — Bug 3 Fix
 * Blends AI (text) sentiment with emoji sentiment signal.
 *
 * Key improvement over the old blendSentimentWithEmoji():
 * - When both signals AGREE → trust AI fully, no change
 * - When signals CONFLICT → shift AI result by exactly ONE level
 * - Returns { finalSentiment, finalSentimentLabel, sentimentConflict }
 */

// Ordered sentiment scale for level shifting
const SENTIMENT_LEVELS = ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'];

// Map level → label
const LEVEL_TO_LABEL = {
    'Very Positive': 'Positive',
    'Positive': 'Positive',
    'Neutral': 'Neutral',
    'Negative': 'Negative',
    'Very Negative': 'Negative'
};

const shiftLevel = (level, direction) => {
    const idx = SENTIMENT_LEVELS.indexOf(level);
    if (idx === -1) return level;
    const newIdx = Math.max(0, Math.min(SENTIMENT_LEVELS.length - 1, idx + direction));
    return SENTIMENT_LEVELS[newIdx];
};

/**
 * Blend AI text sentiment with emoji sentiment signal.
 * @param {string} aiSentimentLevel - 'Very Positive' | 'Positive' | 'Neutral' | 'Negative' | 'Very Negative'
 * @param {string|null} dominantEmojiSentiment - 'positive' | 'negative' | 'neutral' | null
 * @returns {{ finalSentimentLevel: string, finalSentimentLabel: string, sentimentConflict: boolean }}
 */
const blendSentiment = (aiSentimentLevel, dominantEmojiSentiment) => {
    // No emoji → trust AI fully
    if (!dominantEmojiSentiment) {
        return {
            finalSentimentLevel: aiSentimentLevel,
            finalSentimentLabel: LEVEL_TO_LABEL[aiSentimentLevel] || 'Neutral',
            sentimentConflict: false
        };
    }

    const ai = aiSentimentLevel.toLowerCase();
    const emoji = dominantEmojiSentiment.toLowerCase();

    // ─── AGREEMENT: both signals point the same direction → no change ──────
    const aiIsNegative = ai.includes('negative');
    const aiIsPositive = ai.includes('positive');
    const aiIsNeutral = ai === 'neutral';

    if (aiIsNegative && emoji === 'negative') {
        return { finalSentimentLevel: aiSentimentLevel, finalSentimentLabel: LEVEL_TO_LABEL[aiSentimentLevel], sentimentConflict: false };
    }
    if (aiIsPositive && emoji === 'positive') {
        return { finalSentimentLevel: aiSentimentLevel, finalSentimentLabel: LEVEL_TO_LABEL[aiSentimentLevel], sentimentConflict: false };
    }
    if (aiIsNeutral && emoji === 'neutral') {
        return { finalSentimentLevel: aiSentimentLevel, finalSentimentLabel: 'Neutral', sentimentConflict: false };
    }

    // ─── CONFLICT: signals disagree → shift AI level by 1 ─────────────────
    let direction = 0;
    if (emoji === 'negative') direction = -1; // pull toward negative
    if (emoji === 'positive') direction = +1; // pull toward positive
    // emoji neutral: no shift

    const newLevel = direction !== 0 ? shiftLevel(aiSentimentLevel, direction) : aiSentimentLevel;
    const conflicted = newLevel !== aiSentimentLevel;

    return {
        finalSentimentLevel: newLevel,
        finalSentimentLabel: LEVEL_TO_LABEL[newLevel] || 'Neutral',
        sentimentConflict: conflicted
    };
};

export { blendSentiment };
