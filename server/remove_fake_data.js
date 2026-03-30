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
    sentimentLabel: { type: String },
    sentimentLevel: { type: String },
    emotionDetected: [{ type: String }],
    priority: { type: String, default: 'Medium' },
    isCritical: { type: Boolean, default: false },
    status: { type: String, default: 'New' },
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Fake data identifiers from seed scripts
const fakeEmails = [
    'john.doe@example.com',
    'jane.smith@example.com',
    'mike.j@example.com',
    'sarah.w@example.com',
    'tom.brown@example.com'
];

const removeFakeData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Count total before
        const totalBefore = await Feedback.countDocuments();
        console.log(`📊 Total feedback before: ${totalBefore}`);

        // Find fake entries
        const fakeEntries = await Feedback.find({ email: { $in: fakeEmails } });
        console.log(`🔍 Found ${fakeEntries.length} fake entries:`);
        fakeEntries.forEach(entry => {
            console.log(`   - ${entry.name} (${entry.email}): "${entry.feedbackOriginalText.substring(0, 50)}..."`);
        });

        // Remove fake entries
        const result = await Feedback.deleteMany({ email: { $in: fakeEmails } });
        console.log(`🗑️  Removed ${result.deletedCount} fake entries`);

        // Count total after
        const totalAfter = await Feedback.countDocuments();
        console.log(`📊 Total feedback after: ${totalAfter}`);
        console.log(`✅ Your real data (${totalAfter} entries) is preserved!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

removeFakeData();
