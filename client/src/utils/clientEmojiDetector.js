/**
 * Client-side Emoji Detector
 * Pure frontend utility — runs locally with zero API calls.
 * Mirrors the logic in server/src/utils/emojiDetector.js
 */

const POSITIVE_EMOJIS = new Set([
    '😊', '😄', '😁', '😃', '😀', '😍', '🥰', '😎', '🤩', '😇',
    '🎉', '🎊', '👍', '❤️', '🧡', '💛', '💚', '💙', '💜', '💯',
    '🙌', '👏', '✨', '🔥', '🚀', '💪', '🤗', '😂', '🥳', '🏆',
    '⭐', '🌟', '💫', '🙏', '✅', '💝', '💖', '💗', '💓', '💞',
    '😸', '😺', '🎁', '🌈', '☀️', '😻', '🥹', '🫶', '❤‍🔥'
]);

const NEGATIVE_EMOJIS = new Set([
    '😡', '😢', '😭', '😤', '👎', '💔', '😠', '😞', '😟', '🤬',
    '😰', '😣', '😖', '🥺', '😔', '😿', '🙁', '☹️', '😩', '😫',
    '😓', '😥', '😪', '🤦', '🤦‍♂️', '🤦‍♀️', '💀', '☠️', '🤮',
    '🤢', '😷', '🤒', '😾', '🙄', '😒', '😑', '🫠', '🫣'
]);

const NEUTRAL_EMOJIS = new Set([
    '🤔', '😐', '😑', '🙄', '😶', '🤷', '😏', '😬', '🫤', '😒',
    '🤨', '😕', '🫡', '🤐', '😮', '😯', '😲', '🧐', '🤓', '🙃'
]);

const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

/**
 * Detect and classify emojis in text (runs client-side in real-time)
 * @param {string} text
 * @returns {{ hasEmoji: boolean, emojiList: string[], dominantSentiment: string|null }}
 */
const detectEmojisClient = (text) => {
    if (!text || typeof text !== 'string') {
        return { hasEmoji: false, emojiList: [], dominantSentiment: null };
    }

    const matches = [...text.matchAll(EMOJI_REGEX)];
    const emojiList = [...new Set(matches.map(m => m[0]))];

    if (emojiList.length === 0) {
        return { hasEmoji: false, emojiList: [], dominantSentiment: null };
    }

    const counts = { positive: 0, negative: 0, neutral: 0 };
    for (const emoji of emojiList) {
        if (POSITIVE_EMOJIS.has(emoji)) counts.positive++;
        else if (NEGATIVE_EMOJIS.has(emoji)) counts.negative++;
        else counts.neutral++;
    }

    let dominantSentiment = 'neutral';
    if (counts.positive > counts.negative && counts.positive >= counts.neutral) {
        dominantSentiment = 'positive';
    } else if (counts.negative > counts.positive && counts.negative >= counts.neutral) {
        dominantSentiment = 'negative';
    }

    return { hasEmoji: true, emojiList, dominantSentiment };
};

export { detectEmojisClient };
