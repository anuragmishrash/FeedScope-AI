/**
 * Generate AI response suggestions based on sentiment and category
 */
export const generateResponseSuggestion = (feedback) => {
    const { sentimentLabel, sentimentLevel, categoryUserSelected, emotionDetected } = feedback;

    // Template based on sentiment and emotion
    let response = '';

    // Very Negative / Angry
    if (sentimentLevel === 'Very Negative' || emotionDetected.includes('Angry')) {
        response = `Dear valued customer,

We sincerely apologize for the negative experience you've had. Your feedback is extremely important to us, and we take your concerns very seriously.

Our team is committed to addressing this issue immediately. We will investigate the matter thoroughly and take necessary action to prevent similar issues in the future.

We would appreciate the opportunity to make this right. Please contact our support team directly so we can assist you personally.

Thank you for bringing this to our attention.

Best regards,
FeedScope AI Support Team`;
    }
    // Negative / Frustrated
    else if (sentimentLabel === 'Negative' || emotionDetected.includes('Frustrated')) {
        response = `Dear customer,

Thank you for sharing your feedback with us. We apologize for any inconvenience or frustration you've experienced.

We understand how important this is to you, and we're actively working on improvements. Your input helps us identify areas where we can do better.

Our team will review your feedback and work towards a solution. We appreciate your patience and understanding.

Best regards,
FeedScope AI Support Team`;
    }
    // Confused
    else if (emotionDetected.includes('Confused')) {
        response = `Dear customer,

Thank you for reaching out. We apologize for any confusion.

We'd like to help clarify things for you. Our support team is available to guide you through any questions or concerns you may have.

Please don't hesitate to contact us directly, and we'll be happy to provide detailed assistance.

Best regards,
FeedScope AI Support Team`;
    }
    // Positive / Very Positive
    else if (sentimentLabel === 'Positive') {
        response = `Dear valued customer,

Thank you so much for your wonderful feedback! We're thrilled to hear that you're satisfied with our service.

Your positive experience motivates our team to continue delivering the best possible service. We truly appreciate customers like you.

If you have any suggestions for how we can make things even better, we'd love to hear from you!

Best regards,
FeedScope AI Support Team`;
    }
    // Neutral
    else {
        response = `Dear customer,

Thank you for taking the time to share your feedback with us.

We value your input and will use it to improve our services. If you have any specific suggestions or need assistance with anything, please feel free to reach out.

Best regards,
FeedScope AI Support Team`;
    }

    // Add category-specific suggestions
    if (categoryUserSelected === 'Feature Request') {
        response += `\n\nRegarding your feature request: We've forwarded your suggestion to our product development team. Feature requests are carefully evaluated and prioritized based on customer demand.`;
    } else if (categoryUserSelected === 'Bug Report') {
        response += `\n\nRegarding the bug you reported: Our technical team will investigate this issue and work on a fix. We'll keep you updated on the progress.`;
    } else if (categoryUserSelected === 'Pricing Concern') {
        response += `\n\nRegarding pricing: We understand your concerns about our pricing structure. Our team will review your feedback to ensure we're providing the best value to our customers.`;
    }

    return response;
};
