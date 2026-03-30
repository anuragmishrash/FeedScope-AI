import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, User, Mail, MessageSquare, AlertTriangle,
    Tag, Globe, Mic, Copy, Bot, SmilePlus, CheckCheck, Ticket, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Button from './ui/Button';
import StatusBadge from './ui/StatusBadge';
import GlassCard from './ui/GlassCard';

const FeedbackModal = ({ feedback: initialFeedback, onClose, onUpdateStatus }) => {
    const modalRef = useRef();
    const [feedback, setFeedback] = useState(initialFeedback);
    const [copied, setCopied] = useState(false);
    const [adminResponse, setAdminResponse] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill textarea with AI draft when it becomes available
    useEffect(() => {
        if (feedback?.suggestedResponse && !adminResponse) {
            setAdminResponse(feedback.suggestedResponse);
        }
    }, [feedback?.suggestedResponse]);

    // Silent status advance: New/In Review → Being Resolved when admin opens modal
    useEffect(() => {
        if (!feedback?._id) return;
        if (feedback.status === 'New' || feedback.status === 'In Review') {
            api.patch(`/feedback/${feedback._id}/view`)
                .then(res => {
                    if (res.data?.feedback) setFeedback(res.data.feedback);
                })
                .catch(() => {}); // silent fail
        }
    }, [feedback?._id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!feedback) return null;

    const emojiGlowClass = feedback.dominantEmojiSentiment === 'positive'
        ? 'border-emerald-500/30 shadow-emerald-500/10'
        : feedback.dominantEmojiSentiment === 'negative'
        ? 'border-rose-500/30 shadow-rose-500/10'
        : 'border-white/10';

    const handleSaveAndResolve = async () => {
        if (!adminResponse.trim()) return toast.error('Please write a response before resolving.');
        setIsSaving(true);
        try {
            const res = await api.patch(`/feedback/${feedback._id}/resolve`, { adminResponse });
            setFeedback(res.data.feedback);
            if (onUpdateStatus) onUpdateStatus(feedback._id, 'Resolved', res.data.feedback);
            toast.success('Ticket resolved! Response saved.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save resolution.');
        } finally {
            setIsSaving(false);
        }
    };

    const isResolved = feedback.status === 'Resolved' || feedback.status === 'Closed';
    const charCount = adminResponse.length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm"
            >
                <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-2xl relative bg-dark-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Feedback Details
                                    {feedback.isCritical && (
                                        <StatusBadge status="Critical" variant="high" icon={AlertTriangle} />
                                    )}
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <p className="text-sm text-slate-400 flex items-center gap-2">
                                        <Calendar size={14} />
                                        {new Date(feedback.createdAt).toLocaleString()}
                                    </p>
                                    {feedback.ticketId && (
                                        <p className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                            <Ticket size={11} /> {feedback.ticketId}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button variant="ghost" onClick={onClose} className="!p-2 -mr-2">
                                <X size={20} />
                            </Button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">

                            {/* Analysis Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <GlassCard className="!bg-white/5 border-white/10">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sentiment Analysis</p>
                                    <div className="flex items-center gap-3">
                                        <div className={`text-2xl font-bold ${feedback.sentimentLabel === 'Positive' ? 'text-emerald-400' :
                                                feedback.sentimentLabel === 'Negative' ? 'text-rose-400' : 'text-slate-400'
                                            }`}>
                                            {feedback.sentimentLevel}
                                        </div>
                                        <div className="flex-1 h-1.5 bg-dark-900 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${feedback.sentimentLabel === 'Positive' ? 'bg-emerald-500' :
                                                        feedback.sentimentLabel === 'Negative' ? 'bg-rose-500' : 'bg-slate-500'
                                                    }`}
                                                style={{ width: `${feedback.sentimentConfidence ?? 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{feedback.sentimentConfidence ?? 0}%</span>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {feedback.emotionDetected?.map((emotion, i) => (
                                            <StatusBadge key={i} status={emotion} variant="info" />
                                        ))}
                                    </div>
                                    {feedback.sentimentConflict && (
                                        <p className="mt-3 text-xs text-amber-400 flex items-center gap-1">
                                            ⚠️ Conflict detected — emoji tone contradicted text tone.
                                        </p>
                                    )}
                                </GlassCard>

                                <GlassCard className="!bg-white/5 border-white/10">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Metadata</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Language</span>
                                            <span className="text-white flex items-center gap-1 uppercase">
                                                <Globe size={12} /> {feedback.language}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Category</span>
                                            <span className="text-white">{feedback.categoryUserSelected}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Input Mode</span>
                                            <span className="text-white flex items-center gap-1 capitalize">
                                                {feedback.inputMode === 'voice' && <Mic size={12} className="text-primary-400" />}
                                                {feedback.inputMode}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Priority</span>
                                            <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${feedback.priority === 'High' ? 'bg-rose-500/20 text-rose-400' : feedback.priority === 'Low' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {feedback.priority}
                                            </span>
                                        </div>
                                        {feedback.satisfactionRating && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Satisfaction</span>
                                                <span className="text-yellow-400">{'★'.repeat(feedback.satisfactionRating)}{'☆'.repeat(5 - feedback.satisfactionRating)}</span>
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </div>

                            {/* Original Feedback */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <MessageSquare size={16} /> Original Feedback
                                </h3>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-200 leading-relaxed italic">
                                    "{feedback.feedbackOriginalText}"
                                </div>
                            </div>

                            {/* Emoji Analysis */}
                            {feedback.hasEmoji && feedback.emojiList?.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <SmilePlus size={16} /> Emoji Analysis
                                    </h3>
                                    <div className={`p-4 rounded-xl bg-white/5 border ${emojiGlowClass} shadow-lg`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-slate-400 text-sm">Detected:</span>
                                                <span className="text-2xl tracking-widest">{feedback.emojiList.join(' ')}</span>
                                            </div>
                                            {feedback.dominantEmojiSentiment && (
                                                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
                                                    feedback.dominantEmojiSentiment === 'positive'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                        : feedback.dominantEmojiSentiment === 'negative'
                                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                                }`}>
                                                    {feedback.dominantEmojiSentiment.charAt(0).toUpperCase() + feedback.dominantEmojiSentiment.slice(1)} Emoji Tone
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Resolution Writer (replaces suggestedResponse) ─── */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Bot size={16} /> Resolution Response
                                </h3>

                                {isResolved ? (
                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                        <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1">✅ Ticket Resolved</p>
                                        <p className="text-slate-200 text-sm leading-relaxed">{feedback.adminResponse}</p>
                                        {feedback.resolvedAt && (
                                            <p className="text-xs text-slate-500 mt-2">Resolved on {new Date(feedback.resolvedAt).toLocaleString()}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <textarea
                                            value={adminResponse}
                                            onChange={e => setAdminResponse(e.target.value)}
                                            rows={4}
                                            maxLength={500}
                                            placeholder="Write your response to the user..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className={`text-xs ${charCount > 450 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                {charCount}/500 characters
                                            </p>
                                            <button
                                                onClick={handleSaveAndResolve}
                                                disabled={isSaving || !adminResponse.trim()}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-sm py-2 px-5 rounded-xl transition-all"
                                            >
                                                <Save size={14} />
                                                {isSaving ? 'Saving...' : 'Save & Mark Resolved'}
                                            </button>
                                        </div>
                                        {feedback.suggestedResponse && (
                                            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">AI draft (edit above to personalize):</p>
                                                <p className="text-xs text-slate-400 italic line-clamp-2">{feedback.suggestedResponse}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>

                            {/* User Info */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User size={16} /> User Information
                                </h3>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-inner ${
                                        feedback.userId ? 'bg-gradient-to-br from-primary-500 to-accent-purple shadow-white/20' : 'bg-slate-700 shadow-black/20'
                                    }`}>
                                        {(feedback.userName || feedback.name || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-white font-medium text-base">
                                                {feedback.userName || (feedback.name === 'Anonymous' ? 'Anonymous' : feedback.name) || 'Anonymous'}
                                            </p>
                                            {feedback.userId ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                    Registered User
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                    Guest Submission
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                                            <Mail size={14} /> {feedback.userEmail || feedback.email || 'No email provided'}
                                        </p>
                                        {!feedback.userId && (
                                            <p className="text-xs text-slate-500 mt-1.5 italic flex items-center gap-1">
                                                🔘 No Account Linked
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between gap-3">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Tag size={12} /> Status:
                                <span className="text-slate-300 ml-1">{feedback.status}</span>
                            </div>
                            <Button variant="secondary" onClick={onClose}>Close</Button>
                        </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FeedbackModal;
