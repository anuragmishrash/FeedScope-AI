import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, Languages, Keyboard, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import VoiceInput from '../components/VoiceInput';

const CATEGORIES = [
    'UI/UX Issue',
    'Performance Issue',
    'Bug Report',
    'Feature Request',
    'Service Complaint',
    'Pricing Concern',
    'Other'
];

const UserHome = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        rating: 0,
        feedbackText: '',
        category: '',
        language: 'en',
        inputMode: 'text'
    });
    const [hoveredRating, setHoveredRating] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleVoiceTranscript = (text) => {
        setFormData(prev => ({
            ...prev,
            feedbackText: text,
            inputMode: 'voice'
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.rating) {
            toast.error('Please provide a rating');
            return;
        }

        if (!formData.category) {
            toast.error('Please select a category');
            return;
        }

        if (formData.feedbackText.length < 10) {
            toast.error('Feedback must be at least 10 characters');
            return;
        }

        setLoading(true);

        try {
            await api.post('/feedback', formData);

            setShowSuccess(true);
            toast.success('Feedback submitted successfully!');

            // Reset form after animation
            setTimeout(() => {
                setFormData({
                    name: '',
                    email: '',
                    rating: 0,
                    feedbackText: '',
                    category: '',
                    language: 'en',
                    inputMode: 'text'
                });
                setShowSuccess(false);
            }, 3000);

        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/50"
                    >
                        <CheckCircle className="w-12 h-12 text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-2">Thank You!</h2>
                    <p className="text-gray-400">Your feedback has been submitted successfully</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] px-4 py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="text-gradient">Share Your Feedback</span>
                    </h1>
                    <p className="text-gray-400 text-lg">Help us improve by sharing your thoughts and experiences</p>
                </motion.div>

                {/* Form */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onSubmit={handleSubmit}
                    className="glass-card p-8 md:p-12 space-y-8"
                >
                    {/* Name & Email Row */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Name (Optional)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Email (Optional)</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-field"
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>

                    {/* Rating System */}
                    <div>
                        <label className="block text-sm font-medium mb-3">Rating *</label>
                        <div className="flex items-center space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <motion.button
                                    key={star}
                                    type="button"
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setFormData({ ...formData, rating: star })}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="focus:outline-none"
                                >
                                    <Star
                                        className={`w-10 h-10 transition-all ${star <= (hoveredRating || formData.rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-600'
                                            }`}
                                    />
                                </motion.button>
                            ))}
                            {formData.rating > 0 && (
                                <span className="ml-4 text-sm text-gray-400">
                                    {formData.rating} / 5 stars
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Category *</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="input-field"
                            required
                        >
                            <option value="">Select a category</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Language Selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                            <Languages className="w-4 h-4" />
                            <span>Language / भाषा</span>
                        </label>
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, language: 'en' })}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all ${formData.language === 'en'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, language: 'hi' })}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all ${formData.language === 'hi'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                हिन्दी (Hindi)
                            </button>
                        </div>
                    </div>

                    {/* Feedback Text */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                            <Keyboard className="w-4 h-4" />
                            <span>Your Feedback *</span>
                        </label>
                        <textarea
                            value={formData.feedbackText}
                            onChange={(e) => setFormData({ ...formData, feedbackText: e.target.value, inputMode: 'text' })}
                            className="input-field min-h-[150px] resize-none"
                            placeholder={formData.language === 'hi'
                                ? 'अपनी प्रतिक्रिया यहां लिखें...'
                                : 'Share your detailed feedback here...'}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Minimum 10 characters • {formData.feedbackText.length} characters
                        </p>
                    </div>

                    {/* Voice Input */}
                    <div className="border-t border-white/10 pt-6">
                        <label className="block text-sm font-medium mb-3">Or use Voice Input</label>
                        <VoiceInput
                            onTranscript={handleVoiceTranscript}
                        />
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg py-4"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                <span>Submit Feedback</span>
                            </>
                        )}
                    </motion.button>
                </motion.form>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                    <div className="glass-card p-4 text-center">
                        <div className="text-primary-400 text-2xl font-bold mb-1">AI-Powered</div>
                        <p className="text-xs text-gray-400">Sentiment Analysis</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <div className="text-primary-400 text-2xl font-bold mb-1">Multilingual</div>
                        <p className="text-xs text-gray-400">Hindi & English Support</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <div className="text-primary-400 text-2xl font-bold mb-1">Voice Input</div>
                        <p className="text-xs text-gray-400">Speak Your Feedback</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserHome;
