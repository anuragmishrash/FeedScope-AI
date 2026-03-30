import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    // User Information
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    userName: { type: String, default: null },   // snapshot at submission time
    userEmail: { type: String, default: null },  // snapshot at submission time

    // Ticket System (Resolution Tracker)
    ticketId: {
        type: String,
        unique: true,
        sparse: true  // allows null for old records
    },

    // Feedback Content
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    feedbackOriginalText: {
        type: String,
        required: [true, 'Feedback text is required'],
        trim: true
    },
    feedbackTranslatedText: {
        type: String,
        trim: true
    },

    // Language & Input Mode
    language: {
        type: String,
        enum: ['en', 'hi'],
        default: 'en'
    },
    inputMode: {
        type: String,
        enum: ['text', 'voice'],
        default: 'text'
    },

    // Category
    categoryUserSelected: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'UI/UX Issue',
            'Performance Issue',
            'Bug Report',
            'Feature Request',
            'Service Complaint',
            'Pricing Concern',
            'Other'
        ]
    },
    categoryPredicted: {
        type: String
    },
    categoryMismatch: {
        type: Boolean,
        default: false
    },

    // Sentiment Analysis (HuggingFace)
    sentimentLabel: {
        type: String,
        enum: ['Positive', 'Neutral', 'Negative']
    },
    sentimentLevel: {
        type: String,
        enum: ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative']
    },
    hfSentimentLabel: {
        type: String // POSITIVE or NEGATIVE from HuggingFace
    },
    hfConfidence: {
        type: Number,
        min: 0,
        max: 1
    },

    // Emotion Detection
    emotionDetected: [{
        type: String,
        enum: ['Happy', 'Angry', 'Frustrated', 'Confused', 'Satisfied']
    }],

    // Priority & Flags
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium'
    },
    isCritical: {
        type: Boolean,
        default: false
    },
    isSpam: {
        type: Boolean,
        default: false
    },
    isDuplicate: {
        type: Boolean,
        default: false
    },
    spamReason: {
        type: String
    },

    // Workflow Status — includes 'Being Resolved' for auto-progression
    status: {
        type: String,
        enum: ['New', 'In Review', 'Being Resolved', 'Resolved', 'Closed'],
        default: 'New'
    },

    // Emoji Analysis
    hasEmoji: {
        type: Boolean,
        default: false
    },
    emojiList: [{
        type: String
    }],
    dominantEmojiSentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral', null],
        default: null
    },

    // Legacy AI Response (kept for backward compat — not shown in new UI)
    suggestedResponse: {
        type: String
    },

    // Personalized AI Response (Resolution Tracker — replaces suggestedResponse in UI)
    personalizedAIResponse: {
        type: String
    },

    // Admin Resolution
    adminResponse: {
        type: String,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },

    // User Satisfaction Rating
    satisfactionRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    satisfactionSubmitted: {
        type: Boolean,
        default: false
    },

    // Sentiment Analysis Flags
    sentimentConflict: {
        type: Boolean,
        default: false
    },
    sentimentConfidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
feedbackSchema.index({ email: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ sentimentLabel: 1 });
feedbackSchema.index({ isCritical: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ ticketId: 1 });

// Update timestamp on save
feedbackSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
