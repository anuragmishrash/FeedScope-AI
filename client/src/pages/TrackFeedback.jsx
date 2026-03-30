import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, CheckCheck, Star, Bot, Clock, CheckCircle2, Loader2, AlertCircle, Home, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { connectSocket, disconnectSocket } from '../services/socketService';

// Hardcoded for production to bypass Vercel environment variable injection bugs
const API_BASE = 'https://feedscope-backend.onrender.com/api';

// ── Stepper configuration ──────────────────────────────────────────────────
const STEPPER_STAGES = [
    { key: 'New',            label: 'Submitted',      icon: '✅', color: 'emerald' },
    { key: 'In Review',      label: 'In Review',      icon: '🔄', color: 'blue'   },
    { key: 'Being Resolved', label: 'Being Resolved', icon: '🔧', color: 'amber'  },
    { key: 'Resolved',       label: 'Resolved',       icon: '✅', color: 'emerald' },
];

const colorMap = {
    emerald: 'bg-emerald-500 text-white border-emerald-500',
    blue:    'bg-blue-500    text-white border-blue-500',
    amber:   'bg-amber-500   text-white border-amber-500',
};
const pulseMap = {
    emerald: 'ring-emerald-400',
    blue:    'ring-blue-400',
    amber:   'ring-amber-400',
};

const sentimentColor = (label) =>
    label === 'Positive' ? 'text-emerald-400 bg-emerald-500/20' :
    label === 'Negative' ? 'text-rose-400 bg-rose-500/20' :
    'text-slate-300 bg-white/10';

// ── Star Rating Component ──────────────────────────────────────────────────
const StarRating = ({ value, onChange, disabled }) => (
    <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
            <motion.button
                key={star}
                whileHover={!disabled ? { scale: 1.2 } : {}}
                whileTap={!disabled ? { scale: 0.9 } : {}}
                onClick={() => !disabled && onChange(star)}
                className={`text-2xl transition-colors ${
                    star <= value ? 'text-yellow-400' : 'text-slate-600'
                } ${disabled ? 'cursor-default' : 'cursor-pointer hover:text-yellow-300'}`}
            >
                ★
            </motion.button>
        ))}
    </div>
);

// ── GlassCard ─────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${className}`}>
        {children}
    </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const TrackFeedback = () => {
    const { ticketId: paramId } = useParams();
    const navigate = useNavigate();

    const [inputId, setInputId] = useState(paramId || '');
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [starValue, setStarValue] = useState(0);
    const [submittingRating, setSubmittingRating] = useState(false);
    const [ratingDone, setRatingDone] = useState(false);

    // Auto-load if ticketId is in URL
    useEffect(() => {
        if (paramId) {
            setInputId(paramId);
            loadTicket(paramId);
        }
    }, [paramId]);

    const loadTicket = async (id) => {
        const ticketId = (id || inputId).trim().toUpperCase();
        if (!ticketId) return setError('Please enter a ticket ID.');

        setLoading(true);
        setError('');
        setFeedback(null);

        try {
            const res = await axios.get(`${API_BASE}/track/${ticketId}`);
            setFeedback(res.data.feedback);
            setRatingDone(res.data.feedback.satisfactionSubmitted);
            if (id !== paramId) {
                navigate(`/track/${ticketId}`, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'We couldn\'t find a ticket with this ID. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Listen for Real-Time Updates ─────────────────────────────────────
    useEffect(() => {
        if (!feedback) return;

        const socket = connectSocket();

        const handleTicketUpdate = (data) => {
            if (data.ticketId === feedback.ticketId) {
                setFeedback(prev => ({
                    ...prev,
                    status: data.status,
                    ...(data.adminResponse && { adminResponse: data.adminResponse }),
                    ...(data.resolvedAt && { resolvedAt: data.resolvedAt })
                }));
                toast.success(`Ticket Status Updated: ${data.status}`, { icon: '🔔' });
            }
        };

        socket.on('ticket:updated', handleTicketUpdate);

        return () => {
            socket.off('ticket:updated', handleTicketUpdate);
        };
    }, [feedback?.ticketId]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(feedback.ticketId);
        setCopied(true);
        toast.success('Ticket ID copied!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleRatingSubmit = async () => {
        if (!starValue) return toast.error('Please select a rating first.');
        setSubmittingRating(true);
        try {
            await axios.post(`${API_BASE}/track/${feedback.ticketId}/rate`, { rating: starValue });
            setRatingDone(true);
            setFeedback(f => ({ ...f, satisfactionRating: starValue, satisfactionSubmitted: true }));
            toast.success('Thank you for your rating! 🌟');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit rating.');
        } finally {
            setSubmittingRating(false);
        }
    };

    // ── Stepper index ────────────────────────────────────────────────────
    const currentIdx = feedback
        ? Math.max(STEPPER_STAGES.findIndex(s => s.key === feedback.status), 0)
        : -1;

    const isResolved = feedback?.status === 'Resolved' || feedback?.status === 'Closed';

    // ── LOOKUP SCREEN ────────────────────────────────────────────────────
    if (!feedback) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 pt-24">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
                            <Search size={28} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Track Your Feedback</h1>
                        <p className="text-slate-400 mt-2 text-sm">Enter your ticket ID to see live status updates</p>
                    </motion.div>

                    {/* Lookup Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                        Ticket ID
                                    </label>
                                    <input
                                        type="text"
                                        value={inputId}
                                        onChange={e => setInputId(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && loadTicket()}
                                        placeholder="FSC-20240323-A7X2"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                    />
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-3"
                                    >
                                        <AlertCircle size={16} />
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    onClick={() => loadTicket()}
                                    disabled={loading}
                                    className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                    {loading ? 'Searching...' : 'Track My Feedback'}
                                </button>

                                <p className="text-center text-xs text-slate-500">
                                    Your ticket ID was shown after you submitted your feedback
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    <div className="text-center mt-6">
                        <Link to="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center justify-center gap-1">
                            <Home size={14} /> Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── TRACKING RESULT SCREEN ───────────────────────────────────────────
    return (
        <div className="min-h-screen bg-dark-950 pt-24 pb-12 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">Ticket Tracker</h1>
                        <p className="text-slate-400 text-sm font-mono mt-0.5">{feedback.ticketId}</p>
                    </div>
                    <button
                        onClick={() => { setFeedback(null); setError(''); navigate('/track'); }}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        ← New Search
                    </button>
                </motion.div>

                {/* ── Stepper ─────────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card>
                        <div className="flex items-center justify-between relative">
                            {/* Connector line */}
                            <div className="absolute top-5 h-0.5 bg-white/10 z-0" style={{ left: '20px', right: '20px' }} />
                            <div
                                className="absolute top-5 h-0.5 bg-primary-500 z-0 transition-all duration-700"
                                style={{ left: '20px', width: `calc((100% - 40px) * ${currentIdx / (STEPPER_STAGES.length - 1)})` }}
                            />

                            {STEPPER_STAGES.map((stage, idx) => {
                                const done = idx < currentIdx;
                                const active = idx === currentIdx;
                                const upcoming = idx > currentIdx;
                                const col = stage.color;

                                return (
                                    <div key={stage.key} className="flex flex-col items-center gap-2 z-10">
                                        <motion.div
                                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                                                done ? colorMap[col] :
                                                active ? `${colorMap[col]} ring-4 ring-offset-2 ring-offset-dark-950 ${pulseMap[col]}` :
                                                'bg-dark-900 border-white/10 text-slate-500'
                                            }`}
                                            animate={active ? { scale: [1, 1.05, 1] } : {}}
                                            transition={active ? { repeat: Infinity, duration: 2 } : {}}
                                        >
                                            {done ? <CheckCircle2 size={18} /> : <span className="text-xs">{idx + 1}</span>}
                                        </motion.div>
                                        <span className={`text-xs font-medium text-center max-w-[70px] leading-tight ${
                                            done || active ? 'text-white' : 'text-slate-500'
                                        }`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </motion.div>

                {/* ── Card 1: Your Feedback ─────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Your Feedback</p>
                        <blockquote className="text-slate-200 leading-relaxed border-l-2 border-primary-500 pl-4 mb-4 italic">
                            "{feedback.feedbackOriginalText}"
                        </blockquote>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {feedback.sentimentLabel && (
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${sentimentColor(feedback.sentimentLabel)}`}>
                                    {feedback.sentimentLevel || feedback.sentimentLabel}
                                </span>
                            )}
                            {feedback.emotionDetected?.map((e, i) => (
                                <span key={i} className="text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-300">
                                    {e}
                                </span>
                            ))}
                            <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-slate-400">
                                {feedback.categoryUserSelected}
                            </span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <p className="text-xs text-slate-500">
                                Submitted on {new Date(feedback.createdAt).toLocaleString()}
                            </p>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all font-mono"
                            >
                                {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                {feedback.ticketId}
                            </button>
                        </div>
                    </Card>
                </motion.div>

                {/* ── Card 2: AI Acknowledgment ─────────────────────────── */}
                {feedback.personalizedAIResponse && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <Card className="border-violet-500/20">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">AI Acknowledgment</p>
                                    <p className="text-slate-200 text-sm leading-relaxed">{feedback.personalizedAIResponse}</p>
                                    <p className="text-xs text-slate-500 mt-3 italic">Automated acknowledgment based on your feedback</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* ── Card 3: Resolution Note ───────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className={isResolved ? 'border-emerald-500/20' : ''}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resolution Note</p>
                        {isResolved && feedback.adminResponse ? (
                            <>
                                <p className="text-slate-200 text-sm leading-relaxed">{feedback.adminResponse}</p>
                                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                    Response from the FeedScope team · {feedback.resolvedAt ? new Date(feedback.resolvedAt).toLocaleString() : ''}
                                </p>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 text-slate-400">
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Clock size={16} />
                                </motion.div>
                                <p className="text-sm">Our team is working on this. Check back soon.</p>
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* ── Card 4: Satisfaction Rating ───────────────────────── */}
                <AnimatePresence>
                    {isResolved && !feedback.satisfactionSubmitted && !ratingDone && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <Card className="border-yellow-500/20">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Rate This Resolution</p>
                                <p className="text-slate-300 text-sm mb-4">Was this resolution satisfactory?</p>
                                <StarRating value={starValue} onChange={setStarValue} disabled={submittingRating} />
                                <button
                                    onClick={handleRatingSubmit}
                                    disabled={!starValue || submittingRating}
                                    className="mt-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-dark-950 font-semibold py-2 px-6 rounded-xl transition-all text-sm flex items-center gap-2"
                                >
                                    {submittingRating ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                                    Submit Rating
                                </button>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Post-rating thank you */}
                {isResolved && ratingDone && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card className="border-emerald-500/20 text-center">
                            <p className="text-2xl mb-2">🌟</p>
                            <p className="text-white font-semibold">Thank you for your feedback!</p>
                            <p className="text-slate-400 text-sm mt-1">Your rating helps us improve our support quality.</p>
                            {feedback.satisfactionRating && (
                                <StarRating value={feedback.satisfactionRating} onChange={() => {}} disabled={true} />
                            )}
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TrackFeedback;
