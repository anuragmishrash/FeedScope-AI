import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FeedbackModal = ({ feedback, onClose, onStatusUpdate, onGenerateResponse }) => {
    const [newStatus, setNewStatus] = useState(feedback.status);
    const [showResponse, setShowResponse] = useState(false);
    const [suggestedResponse, setSuggestedResponse] = useState('');
    const [showTranslation, setShowTranslation] = useState(false);

    const handleStatusChange = async (e) => {
        const status = e.target.value;
        setNewStatus(status);
        await onStatusUpdate(feedback._id, status);
    };

    const handleGenerateResponse = () => {
        // Generate AI response suggestion
        const response = onGenerateResponse(feedback);
        setSuggestedResponse(response);
        setShowResponse(true);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="glass-card p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Feedback Details</h2>
                            <p className="text-sm text-gray-400">
                                Submitted on {new Date(feedback.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* User Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Name</label>
                                <p className="font-medium">{feedback.name || 'Anonymous'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Email</label>
                                <p className="font-medium">{feedback.email || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Rating & Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Rating</label>
                                <div className="flex items-center space-x-1 mt-1">
                                    {[...Array(feedback.rating)].map((_, i) => (
                                        <span key={i} className="text-yellow-400">★</span>
                                    ))}
                                    <span className="ml-2 text-sm">({feedback.rating}/5)</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Category</label>
                                <p className="font-medium">{feedback.categoryUserSelected}</p>
                            </div>
                        </div>

                        {/* Feedback Text */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-gray-400">
                                    Feedback ({feedback.language.toUpperCase()} - {feedback.inputMode})
                                </label>
                                {feedback.feedbackTranslatedText && (
                                    <button
                                        onClick={() => setShowTranslation(!showTranslation)}
                                        className="text-xs text-primary-400 hover:text-primary-300"
                                    >
                                        {showTranslation ? 'Show Original' : 'Show Translation'}
                                    </button>
                                )}
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <p className="whitespace-pre-wrap">
                                    {showTranslation && feedback.feedbackTranslatedText
                                        ? feedback.feedbackTranslatedText
                                        : feedback.feedbackOriginalText}
                                </p>
                            </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Sentiment</label>
                                <div className="mt-1">
                                    <span className={`badge ${feedback.sentimentLabel === 'Positive' ? 'badge-positive' :
                                            feedback.sentimentLabel === 'Negative' ? 'badge-negative' :
                                                'badge-neutral'
                                        }`}>
                                        {feedback.sentimentLevel}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Confidence: {(feedback.hfConfidence * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Emotions</label>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {feedback.emotionDetected.map((emotion, idx) => (
                                        <span key={idx} className="badge badge-neutral text-xs">
                                            {emotion}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Priority</label>
                                <div className="mt-1">
                                    <span className={`badge ${feedback.priority === 'High' ? 'badge-high' :
                                            feedback.priority === 'Medium' ? 'badge-medium' :
                                                'badge-low'
                                        }`}>
                                        {feedback.priority}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Category Prediction */}
                        {feedback.categoryMismatch && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    ⚠️ Category Mismatch: AI predicted "{feedback.categoryPredicted}"
                                </p>
                            </div>
                        )}

                        {/* Spam/Duplicate Warnings */}
                        {(feedback.isSpam || feedback.isDuplicate) && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-xs text-red-400">
                                    {feedback.isSpam && '🚫 Flagged as Spam'}
                                    {feedback.isDuplicate && '📋 Flagged as Duplicate'}
                                    {feedback.spamReason && ` - ${feedback.spamReason}`}
                                </p>
                            </div>
                        )}

                        {/* Status Update */}
                        <div>
                            <label className="text-xs text-gray-400 block mb-2">Status</label>
                            <select
                                value={newStatus}
                                onChange={handleStatusChange}
                                className="input-field"
                            >
                                <option value="New">New</option>
                                <option value="In Review">In Review</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>

                        {/* AI Response Suggestion */}
                        <div>
                            <button
                                onClick={handleGenerateResponse}
                                className="btn-primary w-full"
                            >
                                Generate AI Response Suggestion
                            </button>

                            {showResponse && suggestedResponse && (
                                <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs text-gray-400">Suggested Response</label>
                                        <button
                                            onClick={() => copyToClipboard(suggestedResponse)}
                                            className="text-xs text-primary-400 hover:text-primary-300"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm">{suggestedResponse}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FeedbackModal;
