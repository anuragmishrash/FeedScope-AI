/**
 * Predict category from feedback text using keyword matching
 */
export const predictCategory = (text) => {
    const lowerText = text.toLowerCase();

    // Define keywords for each category
    const categoryKeywords = {
        'UI/UX Issue': [
            'ui', 'ux', 'design', 'interface', 'layout', 'navigation', 'menu',
            'button', 'color', 'font', 'looks', 'appearance', 'ugly', 'confusing layout',
            'hard to find', 'difficult to use', 'user interface', 'user experience'
        ],
        'Performance Issue': [
            'slow', 'lag', 'loading', 'speed', 'performance', 'freeze', 'crash',
            'timeout', 'delay', 'wait', 'takes long', 'takes forever', 'not responsive',
            'hanging', 'stuck'
        ],
        'Bug Report': [
            'bug', 'error', 'broken', 'not working', 'doesnt work', "doesn't work",
            'issue', 'problem', 'fail', 'wrong', 'incorrect', 'glitch', 'malfunction',
            'crash', 'exception'
        ],
        'Feature Request': [
            'feature', 'add', 'need', 'want', 'wish', 'would be nice', 'should have',
            'missing', 'enhancement', 'improvement', 'suggest', 'suggestion', 'could you',
            'please add', 'new feature'
        ],
        'Service Complaint': [
            'service', 'support', 'customer service', 'help', 'response', 'rude',
            'unhelpful', 'no response', 'waiting', 'contact', 'email', 'phone',
            'representative', 'staff'
        ],
        'Pricing Concern': [
            'price', 'pricing', 'cost', 'expensive', 'cheap', 'money', 'payment',
            'subscription', 'billing', 'charge', 'fee', 'refund', 'value for money',
            'overpriced', 'too much'
        ]
    };

    // Count matches for each category
    const scores = {};

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        scores[category] = keywords.filter(keyword => lowerText.includes(keyword)).length;
    }

    // Find category with highest score
    const maxScore = Math.max(...Object.values(scores));

    if (maxScore > 0) {
        const predictedCategory = Object.keys(scores).find(cat => scores[cat] === maxScore);
        return predictedCategory;
    }

    // Default to 'Other' if no match
    return 'Other';
};

/**
 * Check if predicted category matches user-selected category
 */
export const checkCategoryMismatch = (userCategory, predictedCategory) => {
    return userCategory !== predictedCategory;
};
