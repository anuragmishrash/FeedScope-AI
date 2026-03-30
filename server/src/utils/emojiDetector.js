/**
 * Emoji Detector Utility
 * Detects emojis in feedback text, classifies them, and returns sentiment signal.
 */

// Positive emoji classification set
const POSITIVE_EMOJIS = new Set([
    '😊', '😄', '😁', '😃', '😀', '😍', '🥰', '😎', '🤩', '😇',
    '🎉', '🎊', '👍', '❤️', '🧡', '💛', '💚', '💙', '💜', '💯',
    '🙌', '👏', '✨', '🔥', '🚀', '💪', '🤗', '😂', '🥳', '🏆',
    '⭐', '🌟', '💫', '🙏', '✅', '💝', '💖', '💗', '💓', '💞',
    '😸', '😺', '🎁', '🌈', '☀️', '😻', '🥹', '🫶', '❤‍🔥'
]);

// Negative emoji classification set
const NEGATIVE_EMOJIS = new Set([
    '😡', '😢', '😭', '😤', '👎', '💔', '😠', '😞', '😟', '🤬',
    '😰', '😣', '😖', '🥺', '😔', '😿', '🙁', '☹️', '😩', '😫',
    '😓', '😥', '😪', '🤦', '🤦‍♂️', '🤦‍♀️', '💀', '☠️', '🤮',
    '🤢', '😷', '🤒', '😾', '🙄', '😒', '😑', '🫠', '🫣'
]);

// Neutral emoji classification set
const NEUTRAL_EMOJIS = new Set([
    '🤔', '😐', '😑', '🙄', '😶', '🤷', '😏', '😬', '🫤', '😒',
    '🤨', '😕', '🫡', '🤐', '😮', '😯', '😲', '🧐', '🤓', '🙃'
]);

/**
 * Regex to detect emoji characters
 * Covers most Unicode emoji ranges
 */
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

/**
 * Analyze emojis in feedback text
 * @param {string} text - The feedback text to analyze
 * @returns {{ hasEmoji: boolean, emojiList: string[], dominantEmojiSentiment: string|null, emojiCounts: Object }}
 */
const analyzeEmojis = (text) => {
    if (!text || typeof text !== 'string') {
        return { hasEmoji: false, emojiList: [], dominantEmojiSentiment: null, emojiCounts: {} };
    }

    // Extract all emojis from text
    const matches = [...text.matchAll(EMOJI_REGEX)];
    const emojiList = [...new Set(matches.map(m => m[0]))]; // deduplicate

    if (emojiList.length === 0) {
        return { hasEmoji: false, emojiList: [], dominantEmojiSentiment: null, emojiCounts: {} };
    }

    // Count by sentiment
    const counts = { positive: 0, negative: 0, neutral: 0 };
    for (const emoji of emojiList) {
        if (POSITIVE_EMOJIS.has(emoji)) counts.positive++;
        else if (NEGATIVE_EMOJIS.has(emoji)) counts.negative++;
        else if (NEUTRAL_EMOJIS.has(emoji)) counts.neutral++;
        else counts.neutral++; // unknown emojis default to neutral
    }

    // Determine dominant sentiment
    let dominantEmojiSentiment = null;
    const maxCount = Math.max(counts.positive, counts.negative, counts.neutral);
    if (maxCount > 0) {
        if (counts.positive === maxCount && counts.positive > counts.negative) {
            dominantEmojiSentiment = 'positive';
        } else if (counts.negative === maxCount && counts.negative > counts.positive) {
            dominantEmojiSentiment = 'negative';
        } else if (counts.neutral === maxCount) {
            dominantEmojiSentiment = 'neutral';
        } else {
            dominantEmojiSentiment = 'neutral'; // tie-break
        }
    }

    return {
        hasEmoji: true,
        emojiList,
        dominantEmojiSentiment,
        emojiCounts: counts
    };
};

/**
 * Blend emoji sentiment with primary AI sentiment label
 * @param {string} primaryLabel - 'Positive' | 'Neutral' | 'Negative'
 * @param {string|null} dominantEmojiSentiment - 'positive' | 'negative' | 'neutral' | null
 * @returns {string} - Potentially adjusted sentiment label
 */
const blendSentimentWithEmoji = (primaryLabel, dominantEmojiSentiment) => {
    if (!dominantEmojiSentiment || primaryLabel === 'Neutral') return primaryLabel;

    // If neutral text but strong emoji signal — emoji wins
    if (primaryLabel === 'Neutral') {
        if (dominantEmojiSentiment === 'positive') return 'Positive';
        if (dominantEmojiSentiment === 'negative') return 'Negative';
    }

    // If primary is positive but emoji is strongly negative — lean toward neutral/negative
    if (primaryLabel === 'Positive' && dominantEmojiSentiment === 'negative') {
        return 'Neutral';
    }

    // If primary is negative but emoji is strongly positive — soften to neutral
    if (primaryLabel === 'Negative' && dominantEmojiSentiment === 'positive') {
        return 'Neutral';
    }

    return primaryLabel;
};

export { analyzeEmojis, blendSentimentWithEmoji };
