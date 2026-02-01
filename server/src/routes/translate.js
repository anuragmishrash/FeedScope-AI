import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Simple translation function using basic word mapping
 * For production, use Google Translate API or similar service
 */
const translateText = (text, targetLang) => {
    // Basic Hindi-English dictionary for common feedback words
    const hindiToEnglish = {
        'बहुत': 'very',
        'अच्छा': 'good',
        'बुरा': 'bad',
        'खराब': 'poor',
        'उत्कृष्ट': 'excellent',
        'सेवा': 'service',
        'उत्पाद': 'product',
        'गुणवत्ता': 'quality',
        'धन्यवाद': 'thank you',
        'कृपया': 'please',
        'समस्या': 'problem',
        'मदद': 'help',
        'तेज': 'fast',
        'धीमा': 'slow',
        'महंगा': 'expensive',
        'सस्ता': 'cheap',
        'यह': 'this',
        'है': 'is',
        'बहुत अच्छा': 'very good',
        'बहुत खराब': 'very bad',
        'शानदार': 'amazing',
        'भयानक': 'terrible'
    };

    const englishToHindi = Object.fromEntries(
        Object.entries(hindiToEnglish).map(([k, v]) => [v, k])
    );

    // Detect if text is primarily Hindi (contains Devanagari characters)
    const isHindi = /[\u0900-\u097F]/.test(text);

    // If target language matches source language, return as-is
    if ((targetLang === 'hi' && isHindi) || (targetLang === 'en' && !isHindi)) {
        return text;
    }

    // Simple word-by-word translation for demonstration
    const dictionary = targetLang === 'en' ? hindiToEnglish : englishToHindi;

    let translated = text;
    for (const [source, target] of Object.entries(dictionary)) {
        const regex = new RegExp(source, 'gi');
        translated = translated.replace(regex, target);
    }

    return translated;
};

/**
 * @route   POST /api/translate
 * @desc    Translate text between English and Hindi
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;

        if (!text || !targetLanguage) {
            return res.status(400).json({
                success: false,
                message: 'Text and target language are required'
            });
        }

        if (!['en', 'hi'].includes(targetLanguage)) {
            return res.status(400).json({
                success: false,
                message: 'Target language must be "en" or "hi"'
            });
        }

        // Perform translation
        const translatedText = translateText(text, targetLanguage);

        res.json({
            success: true,
            originalText: text,
            translatedText,
            targetLanguage,
            detectedLanguage: /[\u0900-\u097F]/.test(text) ? 'hi' : 'en'
        });

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            success: false,
            message: 'Translation failed'
        });
    }
});

export default router;
