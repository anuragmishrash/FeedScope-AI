/**
 * AI Response Suggestion Service (now Resolution Draft Service)
 * Generates context-aware resolution drafts for the admin to use when marking a ticket as resolved.
 * Uses rule-based templates for instant generation without additional API calls.
 */

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractTopic(feedbackText = '') {
    return feedbackText.split(' ').slice(0, 8).join(' ');
}

const resolutionTemplates = {
    bugReport: (topic) => randomFrom([
        `The issue with "${topic}" has been identified and fixed in our latest update. Thank you for taking the time to report this to us.`,
        `We have successfully resolved the bug you reported regarding "${topic}". Please let us know if you continue to experience any issues.`
    ]),

    featureRequest: (topic) => randomFrom([
        `We're excited to let you know that we've implemented your suggestion regarding "${topic}". Thanks for your valuable input!`,
        `Your feature request for "${topic}" has been reviewed and added to the platform. We hope you enjoy the new functionality.`
    ]),

    veryNegative: (topic) => randomFrom([
        `Thank you for bearing with us. We have investigated your feedback regarding "${topic}" and our team has deployed a fix to address the root cause.`,
        `We have resolved the problem you mentioned regarding "${topic}". Thank you for your patience while we worked through this.`
    ]),

    negative: (topic) => randomFrom([
        `We wanted to follow up on your feedback about "${topic}". We've made system improvements to address your concerns and hope you have a better experience now.`,
        `The issue concerning "${topic}" has been resolved by our team. We appreciate your feedback in helping us improve.`
    ]),

    neutral: (topic) => randomFrom([
        `Thank you for your feedback about "${topic}". We have reviewed your comments and factored them into our platform enhancements.`,
        `We appreciate your input regarding "${topic}". Our team has reviewed it and taken the necessary steps to improve the experience.`
    ]),

    positive: (topic) => randomFrom([
        `Thanks again for your kind words! We're continuing to improve FeedScope AI to make sure "${topic}" and other features remain excellent.`,
        `We're thrilled you had a good experience with "${topic}". We've shared your feedback with the team and closed this ticket.`
    ]),

    veryPositive: (topic) => randomFrom([
        `Your enthusiasm means a lot to us! We've passed your feedback about "${topic}" to the team. We'll keep working hard to maintain this standard.`,
        `Thank you for the amazing review regarding "${topic}". This feedback has been shared with the relevant teams and we're marking this ticket as resolved.`
    ])
};

const sentimentTemplateMap = {
    'Very Negative': 'veryNegative',
    'Negative': 'negative',
    'Neutral': 'neutral',
    'Positive': 'positive',
    'Very Positive': 'veryPositive',
};

/**
 * Generate a suggested resolution response for a feedback item
 * @param {Object} params
 * @param {string} params.sentimentLevel - 'Very Positive' | 'Positive' | 'Neutral' | 'Negative' | 'Very Negative'
 * @param {string[]} params.emotionDetected - Array of detected emotions
 * @param {string} params.categoryUserSelected - User-selected category
 * @param {string} params.feedbackText - Original feedback text (for context)
 * @returns {string} - Suggested resolution response string
 */
const generateSuggestedResponse = ({ sentimentLevel, emotionDetected, categoryUserSelected, feedbackText }) => {
    const topic = extractTopic(feedbackText);
    
    // Category overrides take priority for bug reports and feature requests
    if (categoryUserSelected === 'Bug Report') return resolutionTemplates.bugReport(topic);
    if (categoryUserSelected === 'Feature Request') return resolutionTemplates.featureRequest(topic);
    
    // Sentiment-based selection
    const level = sentimentLevel || 'Neutral';
    const templateKey = sentimentTemplateMap[level] || 'neutral';
    
    return resolutionTemplates[templateKey](topic);
};

export { generateSuggestedResponse };
