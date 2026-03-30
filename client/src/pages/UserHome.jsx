import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Star, Smile, Copy, CheckCheck, ExternalLink, RotateCcw, User, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import VoiceInput from '../components/VoiceInput';
import { detectEmojisClient } from '../utils/clientEmojiDetector';
import { useAuth } from '../context/AuthContext';

const UserHome = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [category, setCategory] = useState('Other');
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const [emojiPreview, setEmojiPreview] = useState({ hasEmoji: false, emojiList: [], dominantSentiment: null });
    const [submittedTicket, setSubmittedTicket] = useState(null);
    const [ticketCopied, setTicketCopied] = useState(false);

    const categories = ['Bug Report', 'Feature Request', 'UI/UX Issue', 'Performance Issue', 'Service Complaint', 'Pricing Concern', 'Other'];

    const handleTextChange = (e) => {
        const text = e.target.value;
        setFeedbackText(text);
        setEmojiPreview(detectEmojisClient(text));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return toast.error('Please select a rating');
        if (!feedbackText.trim()) return toast.error('Please enter your feedback');

        setIsSubmitting(true);
        try {
            // Attach JWT if user is logged in so backend can snapshot identity
            const headers = {};
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await api.post('/feedback', {
                feedbackText,
                rating,
                category,
                inputMode: voiceActive ? 'voice' : 'text'
            }, { headers });
            const ticketId = res.data?.feedback?.ticketId;
            setSubmittedTicket({ ticketId });
            setFeedbackText('');
            setRating(0);
            setEmojiPreview({ hasEmoji: false, emojiList: [], dominantSentiment: null });
        } catch (error) {
            toast.error('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleCopyTicket = async () => {
        if (!submittedTicket?.ticketId) return;
        await navigator.clipboard.writeText(submittedTicket.ticketId);
        setTicketCopied(true);
        toast.success('Ticket ID copied!');
        setTimeout(() => setTicketCopied(false), 2500);
    };

    const sentimentConfig = {
        positive: { label: 'Positive Tone Detected', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500/20 text-emerald-400' },
        negative: { label: 'Negative Tone Detected', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10', badge: 'bg-rose-500/20 text-rose-400' },
        neutral: { label: 'Neutral Tone', color: 'text-slate-400', border: 'border-slate-500/40', bg: 'bg-slate-500/10', badge: 'bg-slate-500/20 text-slate-400' },
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="w-full max-w-2xl relative z-10">

                {/* ── Success Screen ─────────────────────────────────────── */}
                <AnimatePresence>
                    {submittedTicket && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <GlassCard className="text-center space-y-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1] }}
                                    transition={{ duration: 0.5, ease: 'backOut' }}
                                    className="text-6xl mx-auto w-20 h-20 flex items-center justify-center"
                                >
                                    ✅
                                </motion.div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white">Feedback Received!</h2>
                                    <p className="text-slate-400 mt-2 text-sm">Your ticket has been created.</p>
                                </div>

                                {submittedTicket.ticketId && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="bg-white/5 border border-primary-500/30 rounded-2xl p-5 text-center"
                                    >
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Your Ticket ID</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="font-mono text-2xl font-bold text-primary-400 tracking-widest">
                                                {submittedTicket.ticketId}
                                            </span>
                                            <button
                                                onClick={handleCopyTicket}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                                                title="Copy ticket ID"
                                            >
                                                {ticketCopied
                                                    ? <CheckCheck size={16} className="text-emerald-400" />
                                                    : <Copy size={16} className="text-slate-300" />}
                                            </button>
                                        </div>
                                        {!user && (
                                            <p className="text-xs text-slate-500 mt-2">📋 Save this ID to track your feedback</p>
                                        )}
                                    </motion.div>
                                )}

                                {/* ── Case A: Already logged-in user ── */}
                                {user ? (
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button
                                            onClick={() => navigate('/my-feedbacks')}
                                            className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                                        >
                                            <LayoutList size={16} />
                                            View in My Feedbacks
                                        </button>
                                        <button
                                            onClick={() => setSubmittedTicket(null)}
                                            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-slate-300 font-semibold py-3 px-6 rounded-xl transition-all"
                                        >
                                            <RotateCcw size={16} />
                                            Submit Another
                                        </button>
                                    </div>
                                ) : (
                                    /* ── Case B: Guest submitted ── */
                                    <div className="space-y-4">
                                        <div className="border-t border-white/10 pt-4">
                                            <p className="text-sm text-slate-300 mb-3">
                                                💡 <span className="font-medium">Want to track all your feedbacks without needing this ID?</span>
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                <button
                                                    onClick={() => {
                                                        if (submittedTicket?.ticketId) localStorage.setItem('pendingTicketClaim', submittedTicket.ticketId);
                                                        navigate('/signup');
                                                    }}
                                                    className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-5 rounded-xl transition-all text-sm"
                                                >
                                                    Sign Up Free
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (submittedTicket?.ticketId) localStorage.setItem('pendingTicketClaim', submittedTicket.ticketId);
                                                        navigate('/login');
                                                    }}
                                                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-5 rounded-xl transition-all text-sm"
                                                >
                                                    Sign In
                                                </button>
                                                {submittedTicket.ticketId && (
                                                    <button
                                                        onClick={() => navigate(`/track/${submittedTicket.ticketId}`)}
                                                        className="flex items-center justify-center gap-2 text-slate-400 hover:text-white py-3 px-5 rounded-xl transition-all text-sm"
                                                    >
                                                        <ExternalLink size={14} /> Track with Ticket ID →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSubmittedTicket(null)}
                                            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm py-2.5 px-6 rounded-xl transition-all"
                                        >
                                            <RotateCcw size={14} />
                                            Submit Another Feedback
                                        </button>
                                    </div>
                                )}
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* ── Feedback Form ───────────────────────────────────────── */}
                {!submittedTicket && (
                    <>
                        {/* Auth greeting banner */}
                        {user && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 text-sm"
                            >
                                <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-slate-300">
                                    Submitting as <span className="text-white font-medium">{user.name}</span>
                                </span>
                            </motion.div>
                        )}
                        <div className="text-center mb-10">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="heading-hero text-5xl mb-4"
                            >
                                We Value Your Voice
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-lg text-slate-400 max-w-lg mx-auto"
                            >
                                Help us improve FeedScope AI by sharing your thoughts, reporting bugs, or suggesting new features.
                            </motion.p>
                        </div>

                        <GlassCard className="backdrop-blur-2xl">
                            <form onSubmit={handleSubmit} className="space-y-8">

                                {/* Rating */}
                                <div className="flex flex-col items-center gap-3">
                                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">How was your experience?</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <motion.button
                                                key={star}
                                                type="button"
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="focus:outline-none transition-colors"
                                            >
                                                <Star
                                                    size={32}
                                                    className={`${star <= (hoverRating || rating)
                                                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                                                            : 'text-slate-700'
                                                        } transition-all duration-200`}
                                                />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Selection */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategory(cat)}
                                            className={`py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border
                                                ${category === cat
                                                    ? 'bg-primary-500/20 border-primary-500/50 text-white shadow-[0_0_15px_-5px_rgba(14,165,233,0.4)]'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Feedback Textarea */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 ml-1">Your Feedback</label>
                                    <div className="relative">
                                        <textarea
                                            value={feedbackText}
                                            onChange={handleTextChange}
                                            rows={5}
                                            className="input-premium resize-none"
                                            placeholder="Tell us what you think... emojis are welcome! 😊"
                                        />
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <motion.button
                                                type="button"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setVoiceActive(!voiceActive)}
                                                className={`p-2 rounded-full transition-all ${voiceActive
                                                        ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                                                        : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
                                                    }`}
                                            >
                                                <Mic size={18} />
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Real-time Emoji Sentiment Preview */}
                                    <AnimatePresence>
                                        {emojiPreview.hasEmoji ? (
                                            <motion.div
                                                key="emoji-preview"
                                                initial={{ opacity: 0, height: 0, y: -8 }}
                                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                exit={{ opacity: 0, height: 0, y: -8 }}
                                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                                className="overflow-hidden"
                                            >
                                                <motion.div
                                                    className={`p-3 rounded-xl border ${sentimentConfig[emojiPreview.dominantSentiment]?.border || 'border-white/10'} ${sentimentConfig[emojiPreview.dominantSentiment]?.bg || 'bg-white/5'} backdrop-blur-sm`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <motion.span
                                                                key={emojiPreview.emojiList.join('')}
                                                                initial={{ scale: 0.8 }}
                                                                animate={{ scale: 1 }}
                                                                className="text-xl tracking-wide"
                                                            >
                                                                {emojiPreview.emojiList.slice(0, 4).join(' ')}
                                                            </motion.span>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sentimentConfig[emojiPreview.dominantSentiment]?.badge || 'bg-slate-500/20 text-slate-400'}`}>
                                                                {sentimentConfig[emojiPreview.dominantSentiment]?.label || 'Tone Detected'}
                                                            </span>
                                                        </div>
                                                        <Smile size={14} className={sentimentConfig[emojiPreview.dominantSentiment]?.color || 'text-slate-400'} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        ✨ Our AI will factor your emojis into the sentiment analysis
                                                    </p>
                                                </motion.div>
                                            </motion.div>
                                        ) : (
                                            <motion.p
                                                key="emoji-hint"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-xs text-slate-600 ml-1"
                                            >
                                                Express freely — even emojis are analyzed! 🔍
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Voice Input */}
                                {voiceActive && (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <VoiceInput onTranscript={(text) => {
                                            setFeedbackText(prev => {
                                                const newText = prev + ' ' + text;
                                                setEmojiPreview(detectEmojisClient(newText));
                                                return newText;
                                            });
                                            setVoiceActive(false);
                                        }} />
                                        <p className="text-center text-xs text-slate-400 mt-2">Listening... speak now</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full py-4 text-lg shadow-xl shadow-primary-500/20"
                                    isLoading={isSubmitting}
                                    icon={Send}
                                >
                                    Submit Feedback
                                </Button>
                            </form>
                        </GlassCard>
                    </>
                )}
            </div>
        </div>
    );
};

export default UserHome;
