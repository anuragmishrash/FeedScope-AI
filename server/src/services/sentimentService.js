import axios from 'axios';
import { mapSentiment, hasStrongNegativeWords } from '../utils/sentimentMapper.js';

const SENTIMENT_SERVICE_URL = process.env.SENTIMENT_SERVICE_URL || 'http://127.0.0.1:8001';

// ── In-memory cache ────────────────────────────────────────────────────────
const sentimentCache = new Map();
let cacheStats = { hits: 0, misses: 0, size: 0 };

const normalizeCacheKey = (text) =>
    text.toLowerCase().trim().replace(/\s+/g, ' ');

export const getCacheStats = () => ({
    ...cacheStats,
    size: sentimentCache.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0
        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
        : '0%'
});

export const clearSentimentCache = () => {
    sentimentCache.clear();
    cacheStats = { hits: 0, misses: 0, size: 0 };
    console.log('🗑️  Sentiment cache cleared');
};

// ── Positive signals (used ONLY when no negation precedes them) ─────────────
const STRONG_POSITIVE_PHRASES = [
    'very good', 'so good', 'really good', 'quite good', 'pretty good',
    'works well', 'working well', 'works great', 'very helpful',
    'very easy', 'very reliable', 'very fast', 'very smooth',
    'love it', 'love this', 'great job', 'great app', 'great service',
    'excellent service', 'amazing app', 'excellent work',
    'bahut acha', 'bahut badhiya', 'bahut helpful', // Hindi positive
];

const STANDALONE_POSITIVE_WORDS = [
    'great', 'excellent', 'amazing', 'awesome', 'love', 'perfect',
    'fantastic', 'wonderful', 'brilliant', 'superb', 'outstanding',
    'helpful', 'smooth', 'easy', 'fast', 'reliable', 'nice',
    'happy', 'satisfied', 'badhiya', 'acha', 'sahi', // Hindi
];

// Negation prefixes — if any of these precede a positive word, skip the positive match
const NEGATION_TOKENS = [
    'not', 'no', 'never', 'hardly', 'barely',
    "don't", "doesn't", "didn't", "can't", "won't",
    "isn't", "aren't", "wasn't", "weren't",
    'nahi', 'na', 'bilkul', // Hindi negations
];

const isPrecededByNegation = (word, text) => {
    const tokens = text.toLowerCase().split(/\s+/);
    const idx = tokens.indexOf(word.toLowerCase());
    if (idx <= 0) return false;
    return NEGATION_TOKENS.includes(tokens[idx - 1]) ||
           (idx >= 2 && (tokens[idx - 1] + ' ' + tokens[idx - 2]).split(' ').some(t => NEGATION_TOKENS.includes(t)));
};

/**
 * Negation-aware keyword fallback when Python service is unavailable.
 * Checks negative phrases first (including negated positives), then standalone positives.
 */
const keywordFallback = (text) => {
    const lower = text.toLowerCase();

    // 1. Negative detection wins — hasStrongNegativeWords now understands negation
    if (hasStrongNegativeWords(text)) {
        return {
            hfSentimentLabel: 'NEGATIVE_KEYWORD',
            hfConfidence: 0,
            sentimentConfidence: 75,
            sentimentLabel: 'Negative',
            sentimentLevel: 'Negative'
        };
    }

    // 2. Check strong positive phrases (multi-word, no negation concern)
    const matchesPositivePhrase = STRONG_POSITIVE_PHRASES.some(p => lower.includes(p));

    // 3. Check standalone positive words — but skip if negation precedes them
    const matchesPositiveWord = STANDALONE_POSITIVE_WORDS.some(w => {
        if (!lower.includes(w)) return false;
        return !isPrecededByNegation(w, text); // skip if negated
    });

    if (matchesPositivePhrase || matchesPositiveWord) {
        return {
            hfSentimentLabel: 'POSITIVE_KEYWORD',
            hfConfidence: 0,
            sentimentConfidence: 70,
            sentimentLabel: 'Positive',
            sentimentLevel: 'Positive'
        };
    }

    // 4. Genuinely ambiguous — Neutral
    return {
        hfSentimentLabel: 'UNKNOWN',
        hfConfidence: 0,
        sentimentConfidence: 50,
        sentimentLabel: 'Neutral',
        sentimentLevel: 'Neutral'
    };
};

/**
 * Analyze sentiment using HuggingFace microservice with caching.
 * Falls back to keyword-based analysis when service is offline.
 */
export const analyzeSentiment = async (text) => {
    const cacheKey = normalizeCacheKey(text);

    // Check cache first (applies to both online AND keyword results)
    if (sentimentCache.has(cacheKey)) {
        cacheStats.hits++;
        const { timestamp, ...result } = sentimentCache.get(cacheKey);
        return result;
    }

    cacheStats.misses++;

    try {
        console.log(`❌ Cache MISS - Calling sentiment service (${cacheStats.hits} hits, ${cacheStats.misses} misses)`);

        const response = await axios.post(`${SENTIMENT_SERVICE_URL}/analyze`, { text }, { timeout: 10000 });

        // Debug log — verify exact Python response shape
        console.log('🌐 Raw response.data:', JSON.stringify(response.data));

        const { label, confidence } = response.data;
        console.log('🤖 DistilBERT raw:', { label, confidence, type: typeof confidence });

        // Map to 5-level sentiment (with zero-confidence fallback inside mapper)
        const sentimentMapping = mapSentiment(label, confidence, text);

        // Store confidence as integer % for frontend. Default 75 if 0/null.
        const rawConf = (!confidence || confidence <= 0) ? 0.75 : confidence;
        const sentimentConfidence = Math.round(rawConf * 100);

        const result = {
            hfSentimentLabel: label,
            hfConfidence: confidence,
            sentimentConfidence,
            sentimentLabel: sentimentMapping.sentimentLabel,
            sentimentLevel: sentimentMapping.sentimentLevel
        };

        sentimentCache.set(cacheKey, { ...result, timestamp: Date.now() });
        return result;

    } catch (error) {
        // ── Python service is offline — use keyword-based fallback ────────
        // Do NOT return Neutral blindly. Scan the text for strong signals.
        console.warn('⚠️  Sentiment service offline — using keyword fallback:', error.message);
        const result = keywordFallback(text);

        // Cache keyword results too (short TTL — service may come back online)
        sentimentCache.set(cacheKey, { ...result, timestamp: Date.now() });
        return result;
    }
};

export const checkSentimentService = async () => {
    try {
        await axios.get(`${SENTIMENT_SERVICE_URL}/health`, { timeout: 3000 });
        return true;
    } catch (error) {
        console.warn('⚠️  Sentiment service not available:', error.message);
        return false;
    }
};
