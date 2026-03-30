import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutList, CheckCircle2, ChevronRight, Inbox, AlertCircle, Ticket, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Stepper config ────────────────────────────────────────────────────────
const STAGES = ['New', 'In Review', 'Being Resolved', 'Resolved'];
const STAGE_LABELS = ['Submitted', 'In Review', 'Being Resolved', 'Resolved'];

const sentimentColor = (label) =>
    label === 'Positive'  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    label === 'Negative'  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30';

const statusColor = (status) => ({
    'New': 'bg-slate-500/20 text-slate-300',
    'In Review': 'bg-blue-500/20 text-blue-300',
    'Being Resolved': 'bg-amber-500/20 text-amber-300',
    'Resolved': 'bg-emerald-500/20 text-emerald-300',
    'Closed': 'bg-emerald-500/20 text-emerald-300',
}[status] || 'bg-slate-500/20 text-slate-300');

// ── Mini stepper ──────────────────────────────────────────────────────────
const MiniStepper = ({ status }) => {
    const idx = Math.max(STAGES.indexOf(status), 0);
    return (
        <div className="flex items-center gap-1 mt-4">
            {STAGES.map((_, i) => (
                <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all ${
                        i < idx  ? 'bg-emerald-500 text-white' :
                        i === idx ? 'bg-primary-500 text-white ring-2 ring-primary-400/40' :
                                    'bg-white/5 text-slate-600'
                    }`}>
                        {i < idx ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                    </div>
                    {i < STAGES.length - 1 && (
                        <div className={`flex-1 h-0.5 rounded-full ${i < idx ? 'bg-emerald-500' : 'bg-white/10'}`} />
                    )}
                </div>
            ))}
        </div>
    );
};

// ── Skeleton card ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="flex justify-between mb-3">
            <div className="h-4 w-36 bg-white/10 rounded" />
            <div className="h-4 w-20 bg-white/10 rounded" />
        </div>
        <div className="h-4 w-4/5 bg-white/10 rounded mb-2" />
        <div className="h-4 w-2/3 bg-white/10 rounded mb-4" />
        <div className="flex gap-1">
            {[0,1,2,3].map(i => <div key={i} className="flex-1 h-1.5 bg-white/10 rounded" />)}
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────
const MyFeedbacks = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bannerDismissed, setBannerDismissed] = useState(
        () => localStorage.getItem('claimBannerDismissed') === 'true'
    );

    // Admins shouldn't be here
    useEffect(() => {
        if (isAdmin) navigate('/admin/dashboard', { replace: true });
    }, [isAdmin, navigate]);

    useEffect(() => {
        const fetchMyFeedbacks = async () => {
            try {
                const res = await api.get('/feedback/my');
                setFeedbacks(res.data.feedbacks || []);
            } catch {
                setError('Failed to load your feedbacks. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchMyFeedbacks();
    }, []);

    const stats = {
        total: feedbacks.length,
        resolved: feedbacks.filter(f => f.status === 'Resolved' || f.status === 'Closed').length,
        inProgress: feedbacks.filter(f => f.status !== 'Resolved' && f.status !== 'Closed').length,
    };

    return (
        <div className="min-h-screen bg-dark-950 pt-24 pb-16 px-4">
            <div className="max-w-3xl mx-auto">

                {/* ── Claim Banner (dismissible) ─────────────────────────── */}
                <AnimatePresence>
                    {!bannerDismissed && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="flex items-center justify-between gap-3 bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 mb-6 text-sm"
                        >
                            <div className="flex items-center gap-3">
                                <Ticket size={16} className="text-primary-400 flex-shrink-0" />
                                <span className="text-slate-300">
                                    Submitted feedback before signing in?{' '}
                                    <button
                                        onClick={() => navigate('/claim-ticket')}
                                        className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                                    >
                                        Link it to your account →
                                    </button>
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.setItem('claimBannerDismissed', 'true');
                                    setBannerDismissed(true);
                                }}
                                className="text-slate-500 hover:text-white flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-all"
                                title="Dismiss"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Header ─────────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                            <LayoutList size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">My Feedbacks</h1>
                            <p className="text-slate-400 text-sm">Welcome back, <span className="text-white">{user?.name}</span></p>
                        </div>
                    </div>

                    {!loading && !error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                            className="flex items-center gap-4 mt-4 flex-wrap"
                        >
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm">
                                <span className="text-slate-400">Total </span>
                                <span className="text-white font-semibold">{stats.total}</span>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-sm">
                                <span className="text-slate-400">Resolved </span>
                                <span className="text-emerald-400 font-semibold">{stats.resolved}</span>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-sm">
                                <span className="text-slate-400">In Progress </span>
                                <span className="text-blue-400 font-semibold">{stats.inProgress}</span>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                {/* ── Loading ─────────────────────────────────────────────── */}
                {loading && (
                    <div className="space-y-4">
                        {[0,1,2].map(i => <SkeletonCard key={i} />)}
                    </div>
                )}

                {/* ── Error ───────────────────────────────────────────────── */}
                {error && !loading && (
                    <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 text-rose-400">
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {/* ── Empty state ──────────────────────────────────────────── */}
                {!loading && !error && feedbacks.length === 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center"
                    >
                        <Inbox size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No feedbacks yet</h3>
                        <p className="text-slate-400 text-sm mb-6">You haven't submitted any feedback. Share your thoughts!</p>
                        <Link
                            to="/feedback"
                            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-xl transition-all text-sm"
                        >
                            Submit Your First Feedback →
                        </Link>
                    </motion.div>
                )}

                {/* ── Feedback cards ──────────────────────────────────────── */}
                {!loading && !error && feedbacks.length > 0 && (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {feedbacks.map((fb, idx) => (
                                <motion.div
                                    key={fb.ticketId || idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group"
                                >
                                    {/* Card header row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {fb.ticketId && (
                                                <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-lg">
                                                    {fb.ticketId}
                                                </span>
                                            )}
                                            {fb.sentimentLabel && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sentimentColor(fb.sentimentLabel)}`}>
                                                    {fb.sentimentLevel || fb.sentimentLabel}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(fb.status)}`}>
                                            {fb.status}
                                        </span>
                                    </div>

                                    {/* Feedback text excerpt */}
                                    <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 mb-3 italic">
                                        "{fb.feedbackOriginalText}"
                                    </p>

                                    {/* Submitted date + category */}
                                    <p className="text-xs text-slate-500 mb-1">
                                        {fb.categoryUserSelected} · Submitted {new Date(fb.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>

                                    {/* Mini progress stepper */}
                                    <MiniStepper status={fb.status} />

                                    {/* View Full Details button */}
                                    {fb.ticketId && (
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => navigate(`/track/${fb.ticketId}`)}
                                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all group-hover:text-primary-400"
                                            >
                                                View Full Details <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyFeedbacks;
