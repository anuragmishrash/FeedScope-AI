/**
 * Sentiment Mapper v2
 *
 * Maps raw XLM-RoBERTa { label, confidence } to a 5-level sentiment system.
 *
 * Model outputs: POSITIVE | NEGATIVE | NEUTRAL (all uppercase after normalization in main.py)
 *
 * Key improvements over v1:
 * - Handles new NEUTRAL label from the multilingual model
 * - Negation-aware: "not so good", "not happy", "not satisfied" → Negative
 * - Expanded negative/positive phrase lists
 * - Hindi common words included in strong-negative list
 */

// ── Negation prefixes — words that flip a positive word to negative ───────────
const NEGATION_PREFIXES = [
    'not', "not so", "not very", "not that", "not at all", "not even", "not really",
    'never', 'no',
    'hardly', 'barely', 'scarcely',
    'nahi', 'na', 'nahi hai', 'bilkul nahi', // Hindi negations
    'nothing', 'without',
    "don't", "doesn't", "didn't", "can't", "won't", "shouldn't", "wouldn't", "couldn't",
    "isn't", "aren't", "wasn't", "weren't",
];

// ── Words that are positive on their own but become negative when negated ─────
const NEGATABLE_POSITIVE_WORDS = [
    'good', 'great', 'nice', 'helpful', 'happy', 'satisfied', 'reliable',
    'fast', 'smooth', 'easy', 'excellent', 'amazing', 'outstanding',
    'love', 'like', 'enjoy', 'work', 'works', 'working', 'useful',
    'clear', 'efficient', 'effective', 'proper', 'correct', 'right',
    'acha', 'achcha', 'accha', 'badhiya', 'sahi', 'theek', // Hindi positive words
];

// ── Strong negative phrases (multi-word first, then single) ──────────────────
const STRONG_NEGATIVE_PHRASES = [
    // Negated positives — most common mistakes
    'not so good', 'not good', 'not great', 'not nice', 'not helpful', 'not happy',
    'not satisfied', 'not working', 'not useful', 'not reliable', 'not easy',
    'not at all good', 'not at all satisfied', 'not at all helpful',
    'not that good', 'not very good', 'not really good',
    'nothing good', 'no good',
    // Direct negatives
    'very bad', 'so bad', 'really bad', 'too bad', 'quite bad',
    'not working', 'doesn\'t work', 'does not work', 'not responding',
    'stopped working', 'not able to', 'unable to', 'can\'t access',
    'cannot login', 'can\'t login', 'login issue',
    'keeps happening', 'keeps failing', 'again and again',
    'every time', 'everytime',
    // Hindi negative phrases
    'accha nahi', 'acha nahi', 'theek nahi', 'sahi nahi',
    'bahut bura', 'bahut kharab', 'bilkul sahi nahi',
];

// ── Single strong negative words ──────────────────────────────────────────────
const STRONG_NEGATIVE_WORDS = [
    'bad', 'worst', 'poor', 'slow', 'buggy',
    'terrible', 'awful', 'useless', 'crash', 'crashes', 'hate', 'disappointed',
    'horrible', 'pathetic', 'waste', 'broken', 'garbage', 'trash',
    'disaster', 'nightmare', 'frustrating', 'rubbish',
    'fails', 'failed', 'error', 'bug', 'glitch',
    'stuck', 'hangs', 'freezes', 'lags', 'lag', 'lagging', 'laggy',
    'never', 'kharab', 'bura', 'bekar', 'faltu', // Hindi
];

/**
 * Negation-aware negative detection.
 * First checks multi-word phrases, then checks if any negation precedes a positive word.
 */
const hasStrongNegativeWords = (text = '') => {
    const lower = text.toLowerCase().trim();

    // 1. Check explicit negative phrases (multi-word, catches "not so good" etc.)
    if (STRONG_NEGATIVE_PHRASES.some(phrase => lower.includes(phrase))) {
        return true;
    }

    // 2. Check single strong negative words (standalone)
    if (STRONG_NEGATIVE_WORDS.some(word => {
        // Match as whole word to avoid "bade" matching "bad"
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lower);
    })) {
        return true;
    }

    // 3. Negation + positive word detection
    const words = lower.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const prevWord = i > 0 ? words[i - 1] : '';
        const prevTwoWords = i > 1 ? `${words[i - 2]} ${words[i - 1]}` : '';

        const isPositive = NEGATABLE_POSITIVE_WORDS.includes(word);
        if (!isPositive) continue;

        const preceded_by_negation =
            NEGATION_PREFIXES.includes(prevWord) ||
            NEGATION_PREFIXES.includes(prevTwoWords);

        if (preceded_by_negation) return true;
    }

    return false;
};

/**
 * Map XLM-RoBERTa label + confidence to 5-level sentiment.
 * @param {string} label - 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
 * @param {number} rawConfidence - 0–1 float
 * @param {string} [text] - original text for negation keyword override
 * @returns {{ sentimentLabel: string, sentimentLevel: string }}
 */
const mapSentiment = (label, rawConfidence, text = '') => {
    // ── Zero-confidence safety fallback ──────────────────────────────────────
    const confidence = (!rawConfidence || rawConfidence <= 0) ? 0.70 : rawConfidence;

    // ── Negation Override — always wins over the ML label ────────────────────
    // This catches cases where the model might still get "not so good" wrong.
    if (hasStrongNegativeWords(text)) {
        // Even if model says POSITIVE, known negative phrases force Negative
        if (label !== 'POSITIVE' || confidence < 0.85) {
            return {
                sentimentLabel: 'Negative',
                sentimentLevel: confidence >= 0.85 ? 'Very Negative' : 'Negative'
            };
        }
    }

    // ── NEUTRAL label (new from XLM-RoBERTa) ─────────────────────────────────
    if (label === 'NEUTRAL') {
        return { sentimentLabel: 'Neutral', sentimentLevel: 'Neutral' };
    }

    // ── Below-threshold → Neutral ─────────────────────────────────────────────
    if (confidence < 0.50) {
        return { sentimentLabel: 'Neutral', sentimentLevel: 'Neutral' };
    }

    // ── NEGATIVE branch ───────────────────────────────────────────────────────
    if (label === 'NEGATIVE') {
        if (confidence >= 0.90) return { sentimentLabel: 'Negative', sentimentLevel: 'Very Negative' };
        if (confidence >= 0.65) return { sentimentLabel: 'Negative', sentimentLevel: 'Negative' };
        return { sentimentLabel: 'Neutral', sentimentLevel: 'Neutral' };
    }

    // ── POSITIVE branch ───────────────────────────────────────────────────────
    if (label === 'POSITIVE') {
        if (confidence >= 0.90) return { sentimentLabel: 'Positive', sentimentLevel: 'Very Positive' };
        if (confidence >= 0.65) return { sentimentLabel: 'Positive', sentimentLevel: 'Positive' };
        return { sentimentLabel: 'Neutral', sentimentLevel: 'Neutral' };
    }

    return { sentimentLabel: 'Neutral', sentimentLevel: 'Neutral' };
};

export { mapSentiment, hasStrongNegativeWords };
