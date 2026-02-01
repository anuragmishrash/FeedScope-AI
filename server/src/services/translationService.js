import translate from '@vitalets/google-translate-api';

/**
 * Translate Hindi text to English
 */
export const translateToEnglish = async (text, sourceLang = 'hi') => {
    try {
        // Skip translation if already English
        if (sourceLang === 'en') {
            return text;
        }

        const result = await translate(text, { from: sourceLang, to: 'en' });
        return result.text;

    } catch (error) {
        console.error('Translation error:', error.message);
        // Return original text if translation fails
        return text;
    }
};

/**
 * Detect language of text
 */
export const detectLanguage = async (text) => {
    try {
        const result = await translate(text, { to: 'en' });
        return result.from.language.iso;
    } catch (error) {
        console.error('Language detection error:', error.message);
        return 'en'; // Default to English
    }
};
