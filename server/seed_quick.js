import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔌 Connecting to MongoDB...');
console.log('Connection String:', process.env.MONGO_URI ? 'Found' : 'MISSING');

const feedbackSchema = new mongoose.Schema({
    name: { type: String, default: 'Anonymous' },
    email: { type: String },
    rating: { type: Number, required: true },
    feedbackOriginalText: { type: String, required: true },
    feedbackTranslatedText: { type: String },
    language: { type: String, default: 'en' },
    inputMode: { type: String, default: 'text' },
    categoryUserSelected: { type: String },
    categoryPredicted: { type: String },
    categoryMismatch: { type: Boolean, default: false },
    sentimentLabel: { type: String }, // Positive, Neutral, Negative
    sentimentLevel: { type: String }, // Very Positive, Positive, Neutral, Negative, Very Negative
    emotionDetected: [{ type: String }],
    priority: { type: String, default: 'Medium' }, // Low, Medium, High
    isCritical: { type: Boolean, default: false },
    status: { type: String, default: 'New' }, // New, In Review, Resolved, Closed
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

const sampleFeedbacks = [
    {
        name: 'John Doe',
        email: 'john.doe@example.com',
        rating: 5,
        feedbackOriginalText: 'Excellent service! I love how easy it is to use this platform.',
        sentimentLabel: 'Positive',
        sentimentLevel: 'Very Positive',
        emotionDetected: ['Happy'],
        priority: 'Low',
        status: 'Resolved',
        categoryUserSelected: 'Other',
        categoryPredicted: 'Other',
        language: 'en'
    },
    {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        rating: 1,
        feedbackOriginalText: 'This is absolutely terrible! The app crashes constantly.',
        sentimentLabel: 'Negative',
        sentimentLevel: 'Very Negative',
        emotionDetected: ['Angry', 'Frustrated'],
        priority: 'High',
        isCritical: true,
        status: 'In Review',
        categoryUserSelected: 'Bug Report',
        categoryPredicted: 'Bug Report',
        language: 'en'
    },
    {
        name: 'Mike Johnson',
        email: 'mike.j@example.com',
        rating: 3,
        feedbackOriginalText: 'The app is okay, but it could be better.',
        sentimentLabel: 'Neutral',
        sentimentLevel: 'Neutral',
        emotionDetected: ['Confused'],
        priority: 'Medium',
        status: 'New',
        categoryUserSelected: 'UI/UX Issue',
        categoryPredicted: 'UI/UX Issue',
        language: 'en'
    },
    {
        name: 'Sarah Williams',
        email: 'sarah.w@example.com',
        rating: 2,
        feedbackOriginalText: 'Performance is really slow. Takes forever to load.',
        sentimentLabel: 'Negative',
        sentimentLevel: 'Negative',
        emotionDetected: ['Frustrated'],
        priority: 'High',
        isCritical: true,
        status: 'New',
        categoryUserSelected: 'Performance Issue',
        categoryPredicted: 'Performance Issue',
        language: 'en'
    },
    {
        name: 'Tom Brown',
        email: 'tom.brown@example.com',
        rating: 4,
        feedbackOriginalText: 'Great features! Would love dark mode.',
        sentimentLabel: 'Positive',
        sentimentLevel: 'Positive',
        emotionDetected: ['Satisfied'],
        priority: 'Low',
        status: 'New',
        categoryUserSelected: 'Feature Request',
        categoryPredicted: 'Feature Request',
        language: 'en'
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected.');

        // await Feedback.deleteMany({}); // Uncomment to clear old data
        // console.log('🗑️ Cleared old data.');

        await Feedback.insertMany(sampleFeedbacks);
        console.log('✅ Inserted 5 sample feedbacks.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seed();
