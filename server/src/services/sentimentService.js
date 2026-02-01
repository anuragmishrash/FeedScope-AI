import axios from 'axios';

const SENTIMENT_SERVICE_URL = process.env.SENTIMENT_SERVICE_URL || 'http://127.0.0.1:8001';

// ============================================
// IN-MEMORY CACHE FOR SENTIMENT ANALYSIS
// ============================================
// Cache to store sentiment analysis results
// Key: normalized feedback text (lowercase, trimmed)
// Value: { hfSentimentLabel, hfConfidence, sentimentLabel, sentimentLevel, timestamp }
const sentimentCache = new Map();

// Cache statistics
let cacheStats = {
    hits: 0,
    misses: 0,
    size: 0
};

/**
 * Normalize text for cache key
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove extra spaces
 */
const normalizeCacheKey = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    return {
        ...cacheStats,
        size: sentimentCache.size,
        hitRate: cacheStats.hits + cacheStats.misses > 0
            ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
            : '0%'
    };
};

/**
 * Clear the sentiment cache
 */
export const clearSentimentCache = () => {
    sentimentCache.clear();
    cacheStats = { hits: 0, misses: 0, size: 0 };
    console.log('🗑️  Sentiment cache cleared');
};

/**
 * Analyze sentiment using HuggingFace microservice with caching
 */
export const analyzeSentiment = async (text) => {
    try {
        // Generate cache key from normalized text
        const cacheKey = normalizeCacheKey(text);

        // Check cache first
        if (sentimentCache.has(cacheKey)) {
            cacheStats.hits++;
            const cached = sentimentCache.get(cacheKey);
            console.log(`✅ Cache HIT for sentiment analysis (${cacheStats.hits} hits, ${cacheStats.misses} misses)`);

            // Return cached result (without timestamp)
            const { timestamp, ...result } = cached;
            return result;
        }

        // Cache miss - call Python service
        cacheStats.misses++;
        console.log(`❌ Cache MISS - Calling sentiment service (${cacheStats.hits} hits, ${cacheStats.misses} misses)`);

        const response = await axios.post(`${SENTIMENT_SERVICE_URL}/analyze`, {
            text: text
        }, {
            timeout: 10000 // 10 second timeout
        });

        const { label, confidence } = response.data;

        // Map HuggingFace output to our sentiment system (pass text for keyword checking)
        const sentimentMapping = mapSentiment(label, confidence, text);

        const result = {
            hfSentimentLabel: label,
            hfConfidence: confidence,
            sentimentLabel: sentimentMapping.sentimentLabel,
            sentimentLevel: sentimentMapping.sentimentLevel
        };

        // Store in cache with timestamp
        sentimentCache.set(cacheKey, {
            ...result,
            timestamp: Date.now()
        });

        console.log(`💾 Cached sentiment result. Cache size: ${sentimentCache.size}`);

        return result;

    } catch (error) {
        console.error('Sentiment analysis error:', error.message);

        // Fallback: Return neutral sentiment if service fails
        return {
            hfSentimentLabel: 'UNKNOWN',
            hfConfidence: 0,
            sentimentLabel: 'Neutral',
            sentimentLevel: 'Neutral'
        };
    }
};

/**
 * Strong negative keywords that indicate genuine negative sentiment
 * even with low confidence scores
 */
const strongNegativeWords = [
    'bad', 'very bad', 'worst', 'poor', 'slow', 'buggy',
    'terrible', 'awful', 'useless', 'crash', 'hate', 'disappointed',
    'horrible', 'pathetic', 'waste', 'broken', 'garbage', 'trash',
    'never', 'disaster', 'nightmare', 'frustrating', 'rubbish'
];

/**
 * Check if text contains strong negative words
 */
const hasStrongNegative = (text) => {
    const lowerText = text.toLowerCase();
    return strongNegativeWords.some(word => lowerText.includes(word));
};

/**
 * Map HuggingFace sentiment to our multi-level system
 * Fixed logic to prevent misclassification of negative feedback as Neutral
 */
const mapSentiment = (label, confidence, text = '') => {
    // ============================================
    // CRITICAL: Strong Negative Override
    // ============================================
    // If HuggingFace detected NEGATIVE and text contains strong negative words,
    // NEVER mark as Neutral, regardless of confidence
    if (label === 'NEGATIVE' && hasStrongNegative(text)) {
        if (confidence > 0.75) {
            return {
                sentimentLabel: 'Negative',
                sentimentLevel: 'Very Negative'
            };
        } else {
            return {
                sentimentLabel: 'Negative',
                sentimentLevel: 'Negative'
            };
        }
    }

    // ============================================
    // NEUTRAL LOGIC - Only for low-confidence POSITIVE
    // ============================================
    // Neutral should only apply to ambiguous POSITIVE feedback
    // Examples: "okay", "fine", "average"
    if (label === 'POSITIVE' && confidence < 0.55) {
        return {
            sentimentLabel: 'Neutral',
            sentimentLevel: 'Neutral'
        };
    }

    // ============================================
    // NORMAL NEGATIVE (without strong keywords)
    // ============================================
    if (label === 'NEGATIVE') {
        if (confidence > 0.85) {
            return {
                sentimentLabel: 'Negative',
                sentimentLevel: 'Very Negative'
            };
        } else {
            return {
                sentimentLabel: 'Negative',
                sentimentLevel: 'Negative'
            };
        }
    }

    // ============================================
    // NORMAL POSITIVE
    // ============================================
    if (label === 'POSITIVE') {
        if (confidence > 0.85) {
            return {
                sentimentLabel: 'Positive',
                sentimentLevel: 'Very Positive'
            };
        } else {
            return {
                sentimentLabel: 'Positive',
                sentimentLevel: 'Positive'
            };
        }
    }

    // Default fallback
    return {
        sentimentLabel: 'Neutral',
        sentimentLevel: 'Neutral'
    };
};

/**
 * Check if sentiment service is available
 */
export const checkSentimentService = async () => {
    try {
        await axios.get(`${SENTIMENT_SERVICE_URL}/health`, { timeout: 3000 });
        return true;
    } catch (error) {
        console.warn('⚠️  Sentiment service not available:', error.message);
        return false;
    }
};
