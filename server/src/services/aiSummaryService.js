import { GoogleGenerativeAI } from '@google/generative-ai';

const generateFeedbackSummary = async (feedbacks, dateRange) => {
  // We no longer handle caching here; it is handled by MongoDB via routes/feedback.js
  // Initialize Gemini client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
    },
  });

  // Prepare feedback data for the prompt
  const feedbackData = feedbacks.map((f, i) =>
    `${i + 1}. [${f.sentimentLevel || f.sentimentLabel || 'Unknown'}] [${f.categoryUserSelected || 'General'}] [${Array.isArray(f.emotionDetected) ? f.emotionDetected.join(', ') : 'N/A'}] "${f.feedbackOriginalText || ''}"`
  ).join('\n');

  const prompt = `You are an analytics assistant for a feedback management system called FeedScope AI.

Analyze the following ${feedbacks.length} user feedback entries from ${dateRange} and provide a structured summary.

FEEDBACK DATA:
${feedbackData}

CRITICAL INSTRUCTION: Respond with ONLY a valid JSON object. No markdown. No backticks. No explanations before or after. Just the raw JSON object starting with { and ending with }.

The JSON must follow this exact structure:
{
  "overview": "2-3 sentence executive summary of overall feedback sentiment and volume",
  "topComplaints": [
    { "issue": "brief issue title", "description": "1 sentence explanation", "count": 5, "severity": "high" },
    { "issue": "brief issue title", "description": "1 sentence explanation", "count": 3, "severity": "medium" },
    { "issue": "brief issue title", "description": "1 sentence explanation", "count": 2, "severity": "low" }
  ],
  "topPraises": [
    { "feature": "brief feature title", "description": "1 sentence explanation", "count": 8 },
    { "feature": "brief feature title", "description": "1 sentence explanation", "count": 5 },
    { "feature": "brief feature title", "description": "1 sentence explanation", "count": 3 }
  ],
  "actionItems": [
    { "priority": "high", "action": "specific actionable recommendation", "rationale": "why this matters" },
    { "priority": "medium", "action": "specific actionable recommendation", "rationale": "why this matters" },
    { "priority": "low", "action": "specific actionable recommendation", "rationale": "why this matters" }
  ],
  "sentimentBreakdown": {
    "veryPositive": 0,
    "positive": 0,
    "neutral": 0,
    "negative": 0,
    "veryNegative": 0
  },
  "keyInsight": "The single most important takeaway from this feedback batch in one sentence"
}`;

  // Helper function for delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  let result;
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      result = await model.generateContent(prompt);
      break; // Success, exit loop
    } catch (apiErr) {
      if (apiErr.message?.includes('RATE_LIMIT_EXCEEDED') || apiErr.status === 429 || apiErr.message?.includes('429')) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('Gemini rate limit reached permanently. Please wait a full minute then try again.');
        }
        console.warn(`[Gemini] Rate limit hit. Retrying in ${retries * 3} seconds... (Attempt ${retries}/${maxRetries})`);
        await delay(retries * 3000); // 3s, 6s
      } else {
        throw apiErr; // Other errors should fail immediately
      }
    }
  }

  try {
    const rawContent = result.response.text();

    if (!rawContent) {
      throw new Error('Empty response from Gemini');
    }

    // Strip any accidental markdown fences Gemini might add
    let cleaned = rawContent.replace(/```json|```/g, '').trim();

    // Extract JSON object in case Gemini adds any surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\} /) || cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[Gemini] Raw response that failed to parse:', rawContent);
      throw new Error('Gemini returned malformed JSON. Try again.');
    }

    // Validate required fields
    if (!parsed.overview || !parsed.topComplaints || !parsed.actionItems || !parsed.keyInsight) {
      throw new Error('Gemini response was incomplete. Try again.');
    }

    // Ensure arrays exist and have items — fill defaults if empty
    if (!Array.isArray(parsed.topComplaints)) parsed.topComplaints = [];
    if (!Array.isArray(parsed.topPraises)) parsed.topPraises = [];
    if (!Array.isArray(parsed.actionItems)) parsed.actionItems = [];
    if (!parsed.sentimentBreakdown) {
      parsed.sentimentBreakdown = { veryPositive: 0, positive: 0, neutral: 0, negative: 0, veryNegative: 0 };
    }

    return parsed;

  } catch (err) {
    // Handle Gemini-specific API errors
    if (err.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Gemini API key. Check GEMINI_API_KEY in your .env file.');
    }
    if (err.message?.includes('permanently')) {
      throw err;
    }
    if (err.message?.includes('SAFETY')) {
      throw new Error('Gemini flagged the content. Try with different feedback data.');
    }
    // Re-throw our own errors as-is
    if (err.message?.includes('malformed') || err.message?.includes('incomplete') || err.message?.includes('Empty')) {
      throw err;
    }
    // Unknown error
    console.error('[Gemini] Unexpected error:', err);
    throw new Error('AI service error. Please try again.');
  }
};

export { generateFeedbackSummary };
