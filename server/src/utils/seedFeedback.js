import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Feedback from '../models/Feedback.js';

dotenv.config();

const sampleFeedbacks = [
    {
        name: 'John Doe',
        email: 'john.doe@example.com',
        rating: 5,
        feedbackOriginalText: 'Excellent service! I love how easy it is to use this platform. Everything works smoothly and the interface is beautiful.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'UI/UX Issue',
        categoryPredicted: 'Feature Request',
        categoryMismatch: true,
        sentimentLabel: 'Positive',
        sentimentLevel: 'Very Positive',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.95,
        emotionDetected: ['Happy', 'Satisfied'],
        priority: 'Low',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'Resolved'
    },
    {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        rating: 1,
        feedbackOriginalText: 'This is absolutely terrible! The app crashes constantly and I lost all my data. Very frustrating and unacceptable.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'Bug Report',
        categoryPredicted: 'Bug Report',
        categoryMismatch: false,
        sentimentLabel: 'Negative',
        sentimentLevel: 'Very Negative',
        hfSentimentLabel: 'NEGATIVE',
        hfConfidence: 0.98,
        emotionDetected: ['Angry', 'Frustrated'],
        priority: 'High',
        isCritical: true,
        isSpam: false,
        isDuplicate: false,
        status: 'In Review'
    },
    {
        name: 'राज कुमार',
        email: 'raj.kumar@example.com',
        rating: 4,
        feedbackOriginalText: 'यह सेवा बहुत अच्छी है। मुझे यह बहुत पसंद आया।',
        feedbackTranslatedText: 'This service is very good. I liked it very much.',
        language: 'hi',
        inputMode: 'voice',
        categoryUserSelected: 'Service Complaint',
        categoryPredicted: 'Other',
        categoryMismatch: true,
        sentimentLabel: 'Positive',
        sentimentLevel: 'Positive',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.88,
        emotionDetected: ['Happy', 'Satisfied'],
        priority: 'Medium',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'New'
    },
    {
        name: 'Mike Johnson',
        email: 'mike.j@example.com',
        rating: 3,
        feedbackOriginalText: 'The app is okay, but it could be better. I found it a bit confusing to navigate at first.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'UI/UX Issue',
        categoryPredicted: 'UI/UX Issue',
        categoryMismatch: false,
        sentimentLabel: 'Neutral',
        sentimentLevel: 'Neutral',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.55,
        emotionDetected: ['Confused'],
        priority: 'Medium',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'New'
    },
    {
        name: 'Sarah Williams',
        email: 'sarah.w@example.com',
        rating: 2,
        feedbackOriginalText: 'Performance is really slow. Takes forever to load pages. Needs improvement.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'Performance Issue',
        categoryPredicted: 'Performance Issue',
        categoryMismatch: false,
        sentimentLabel: 'Negative',
        sentimentLevel: 'Negative',
        hfSentimentLabel: 'NEGATIVE',
        hfConfidence: 0.82,
        emotionDetected: ['Frustrated'],
        priority: 'High',
        isCritical: true,
        isSpam: false,
        isDuplicate: false,
        status: 'New'
    },
    {
        name: 'अनिता शर्मा',
        email: 'anita.sharma@example.com',
        rating: 5,
        feedbackOriginalText: 'बहुत बढ़िया! मैं इसकी सिफारिश करती हूँ।',
        feedbackTranslatedText: 'Very good! I recommend this.',
        language: 'hi',
        inputMode: 'voice',
        categoryUserSelected: 'Other',
        categoryPredicted: 'Other',
        categoryMismatch: false,
        sentimentLabel: 'Positive',
        sentimentLevel: 'Very Positive',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.92,
        emotionDetected: ['Happy'],
        priority: 'Low',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'Closed'
    },
    {
        name: 'Tom Brown',
        email: 'tom.brown@example.com',
        rating: 4,
        feedbackOriginalText: 'Great features! Would love to see dark mode added though.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'Feature Request',
        categoryPredicted: 'Feature Request',
        categoryMismatch: false,
        sentimentLabel: 'Positive',
        sentimentLevel: 'Positive',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.85,
        emotionDetected: ['Satisfied'],
        priority: 'Low',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'New'
    },
    {
        name: 'Lisa Anderson',
        email: 'lisa.a@example.com',
        rating: 1,
        feedbackOriginalText: 'Pricing is ridiculous. Way too expensive for what you get. Totally not worth it.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'Pricing Concern',
        categoryPredicted: 'Pricing Concern',
        categoryMismatch: false,
        sentimentLabel: 'Negative',
        sentimentLevel: 'Very Negative',
        hfSentimentLabel: 'NEGATIVE',
        hfConfidence: 0.93,
        emotionDetected: ['Angry'],
        priority: 'High',
        isCritical: true,
        isSpam: false,
        isDuplicate: false,
        status: 'In Review'
    },
    {
        name: 'Anonymous',
        email: null,
        rating: 3,
        feedbackOriginalText: 'It works. Nothing special.',
        language: 'en',
        inputMode: 'text',
        categoryUserSelected: 'Other',
        categoryPredicted: 'Other',
        categoryMismatch: false,
        sentimentLabel: 'Neutral',
        sentimentLevel: 'Neutral',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.52,
        emotionDetected: [],
        priority: 'Low',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'Closed'
    },
    {
        name: 'David Lee',
        email: 'david.lee@example.com',
        rating: 5,
        feedbackOriginalText: 'Perfect! Exactly what I needed. Customer support is also fantastic.',
        language: 'en',
        inputMode: 'voice',
        categoryUserSelected: 'Service Complaint',
        categoryPredicted: 'Other',
        categoryMismatch: true,
        sentimentLabel: 'Positive',
        sentimentLevel: 'Very Positive',
        hfSentimentLabel: 'POSITIVE',
        hfConfidence: 0.97,
        emotionDetected: ['Happy', 'Satisfied'],
        priority: 'Low',
        isCritical: false,
        isSpam: false,
        isDuplicate: false,
        status: 'Resolved'
    }
];

const seedFeedback = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing feedback (optional - comment out if you want to keep existing data)
        // await Feedback.deleteMany({});
        // console.log('🗑️  Cleared existing feedback');

        // Insert sample feedbacks
        const result = await Feedback.insertMany(sampleFeedbacks);
        console.log(`✅ Inserted ${result.length} sample feedbacks`);

        // Show summary
        const stats = await Feedback.aggregate([
            {
                $group: {
                    _id: '$sentimentLabel',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('\n📊 Feedback Summary:');
        stats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count}`);
        });

        console.log('\n✅ Seed data inserted successfully!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding feedback:', error);
        process.exit(1);
    }
};

seedFeedback();
