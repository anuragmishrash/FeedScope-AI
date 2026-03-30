import mongoose from 'mongoose';

const summaryCacheSchema = new mongoose.Schema({
  period: {
    type: String,
    required: true,
    enum: ['today', 'week', 'month', 'custom'],
  },
  // For custom range, store the dates as a combined key
  periodKey: {
    type: String,
    required: true,
    unique: true,
  },
  summary: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  feedbackCount: {
    type: Number,
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // MongoDB TTL index — auto-deletes document when expiresAt passes
  },
});

// Compound index for fast lookup by period
summaryCacheSchema.index({ periodKey: 1, expiresAt: 1 });

const SummaryCache = mongoose.model('SummaryCache', summaryCacheSchema);

export default SummaryCache;
