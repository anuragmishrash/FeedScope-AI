/**
 * Personalized AI Response Service
 * Generates context-aware, empathetic responses based on:
 * - feedbackText (extracts topic from first 8 words)
 * - sentimentLevel (Very Positive / Positive / Neutral / Negative / Very Negative)
 * - emotion (Happy / Satisfied / Frustrated / Angry / Confused)
 * - category (Bug Report / Feature Request / etc.)
 *
 * Category overrides take priority over sentiment templates.
 */

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractTopic(feedbackText = '') {
    return feedbackText.split(' ').slice(0, 8).join(' ');
}

const templates = {
    veryNegative: (topic) => randomFrom([
        `We're really sorry to hear about your experience with "${topic}". This is not the standard we hold ourselves to, and we take this seriously. Our team has been notified and will investigate immediately.`,
        `Thank you for bringing this to our attention. What you've described — "${topic}" — is completely unacceptable and we understand your frustration. We're treating this as a priority issue.`,
        `We sincerely apologize for the experience you've had. Your feedback about "${topic}" has been escalated to our technical team. You deserve better and we're committed to fixing this.`,
    ]),

    negative: (topic) => randomFrom([
        `We're sorry this hasn't been working as expected. Your feedback about "${topic}" has been logged and assigned to the right team. We appreciate you taking the time to let us know.`,
        `Thank you for this feedback. We understand how frustrating it can be when things don't work the way they should. We're looking into "${topic}" and will work on improving it.`,
        `We hear you. The issue you mentioned — "${topic}" — is important to us. Our team will review this and work toward a resolution.`,
    ]),

    neutral: (topic) => randomFrom([
        `Thanks for sharing your thoughts on "${topic}". We've noted your feedback and our team will take a closer look to understand what can be improved.`,
        `We appreciate you taking the time to write to us about "${topic}". Your input helps us understand where we need to do better.`,
        `Thank you for this feedback. We've logged your thoughts on "${topic}" and will factor it into our upcoming improvements.`,
    ]),

    positive: (topic) => randomFrom([
        `We're glad to hear that "${topic}" is working well for you! Your positive feedback motivates our team to keep improving.`,
        `Thank you for the kind words about "${topic}". It means a lot to our team to know we're making a difference.`,
        `That's wonderful to hear! We're happy "${topic}" has been a good experience. We'll keep working to maintain this standard.`,
    ]),

    veryPositive: (topic) => randomFrom([
        `Wow, thank you so much! Hearing that "${topic}" has been such a great experience genuinely makes our day. We'll pass this along to the team!`,
        `This made us smile! We're thrilled that "${topic}" exceeded your expectations. Reviews like yours keep us going.`,
        `Amazing — thank you! We're so happy to hear about your experience with "${topic}". This is exactly what we work hard for every day.`,
    ]),

    bugReport: (topic) => randomFrom([
        `Thank you for reporting this bug. Your detailed feedback about "${topic}" has been logged as a bug report and assigned to our engineering team. We'll investigate and keep you updated via your ticket.`,
        `Bug confirmed and logged with high priority. We appreciate you taking the time to report "${topic}" in detail — this kind of feedback is invaluable for improving the product.`,
    ]),

    featureRequest: (topic) => randomFrom([
        `Great idea! Your suggestion about "${topic}" has been added to our feature request backlog. Our product team reviews these regularly and your input could shape our next update.`,
        `Thank you for this suggestion. We've noted your idea about "${topic}" and will evaluate it for a future release. We love hearing how users want the product to grow.`,
    ]),
};

const sentimentTemplateMap = {
    'Very Negative': 'veryNegative',
    'Negative': 'negative',
    'Neutral': 'neutral',
    'Positive': 'positive',
    'Very Positive': 'veryPositive',
};

/**
 * Generate a personalized acknowledgment response.
 * @param {string} feedbackText
 * @param {string} sentimentLevel - 'Very Negative' | 'Negative' | 'Neutral' | 'Positive' | 'Very Positive'
 * @param {string} emotion - 'Angry' | 'Frustrated' | 'Confused' | 'Satisfied' | 'Happy'
 * @param {string} category - 'Bug Report' | 'Feature Request' | etc.
 * @returns {string}
 */
export function generatePersonalizedResponse(feedbackText, sentimentLevel, emotion, category) {
    const topic = extractTopic(feedbackText);

    // Category overrides take priority
    if (category === 'Bug Report') return templates.bugReport(topic);
    if (category === 'Feature Request') return templates.featureRequest(topic);

    // Sentiment-based selection
    const templateKey = sentimentTemplateMap[sentimentLevel] || 'neutral';
    return templates[templateKey](topic);
}
