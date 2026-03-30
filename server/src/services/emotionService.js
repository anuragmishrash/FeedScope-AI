/**
 * Emotion Detection Service — Bug 4 Fix
 * Expanded vocabulary + scoring logic (most-matches wins over first-match).
 */

// ── Expanded keyword map ────────────────────────────────────────────────────
const emotionKeywords = {
    angry: [
        'angry', 'furious', 'outraged', 'unacceptable', 'ridiculous',
        'terrible', 'horrible', 'worst', 'hate', 'disgusting', 'pathetic',
        'useless', 'garbage', 'trash', 'scam', 'fraud', 'awful',
        'disgusted', 'appalled', 'infuriating', 'abysmal', 'atrocious'
    ],
    frustrated: [
        'frustrated', 'annoying', 'annoyed', 'irritating', 'broken',
        'crashes', 'crash', 'hangs', 'freezes', 'slow', 'laggy', 'lag',
        "doesn't work", 'does not work', 'not working', 'failed', 'fails',
        'keeps failing', 'again and again', 'every time', 'everytime',
        'impossible', "can't", 'cannot', 'unable', 'stuck', 'error',
        'bug', 'glitch', 'issue', 'problem', 'not fixed', 'still broken',
        'keeps happening', 'wasted', 'disappointing', 'disappointed'
    ],
    confused: [
        'confused', 'confusing', 'unclear', "don't understand", 'how do i',
        'how to', 'what is', 'not sure', 'complicated', 'complex',
        'difficult', 'hard to', "can't figure", 'lost', 'weird', 'strange',
        'unexpected', 'dont know', "don't know", 'unsure', 'vague'
    ],
    happy: [
        'happy', 'love', 'loving', 'excellent', 'amazing', 'awesome',
        'fantastic', 'great', 'wonderful', 'brilliant', 'perfect',
        'superb', 'outstanding', 'incredible', 'best', 'impressed',
        'delighted', 'thrilled', 'ecstatic', 'overjoyed', 'wow'
    ],
    satisfied: [
        'satisfied', 'good', 'nice', 'fine', 'okay', 'ok', 'decent',
        'works well', 'working well', 'helpful', 'useful', 'smooth',
        'easy', 'simple', 'intuitive', 'clean', 'fast', 'reliable',
        'solid', 'stable', 'consistent', 'recommend', 'fair', 'alright'
    ]
};

// ── Sentiment-based default emotions ────────────────────────────────────────
const sentimentDefaults = {
    'Very Positive': 'Happy',
    'Positive': 'Satisfied',
    'Neutral': 'Confused',
    'Negative': 'Frustrated',
    'Very Negative': 'Angry'
};

/**
 * Detect the primary emotion from feedback text using scored keyword matching.
 * @param {string} text - Feedback text (should be English/translated)
 * @param {string} sentimentLevel - e.g. 'Very Negative', 'Positive'
 * @returns {string} - Capitalized emotion: 'Happy' | 'Satisfied' | 'Angry' | 'Frustrated' | 'Confused'
 */
export const detectEmotion = (text, sentimentLevel) => {
    const lower = text.toLowerCase();
    const scores = {};

    // Count matches per emotion (most-matches-wins vs old first-match)
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        scores[emotion] = keywords.filter(kw => lower.includes(kw)).length;
    }

    const maxScore = Math.max(...Object.values(scores));

    if (maxScore > 0) {
        // Find the emotion with the highest match count
        const winner = Object.entries(scores).find(([, v]) => v === maxScore)?.[0];
        if (winner) return winner.charAt(0).toUpperCase() + winner.slice(1);
    }

    // No matches → fall back to sentiment-based default
    return sentimentDefaults[sentimentLevel] || 'Satisfied';
};

/**
 * Legacy array wrapper for backward compatibility.
 * Returns a single-element array so existing code using emotions[0] still works.
 */
export const detectEmotions = (text, sentimentLevel) => {
    return [detectEmotion(text, sentimentLevel)];
};
