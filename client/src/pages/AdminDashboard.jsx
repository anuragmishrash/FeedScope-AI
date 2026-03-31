import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
    TrendingUp, AlertTriangle, Star, MessageSquare, Download,
    Search, ChevronLeft, ChevronRight, Zap, Bot, SmilePlus,
    Sparkles, RefreshCw, X, Wifi, WifiOff, Loader2, ChevronDown
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../utils/api';
import FeedbackModal from '../components/FeedbackModal';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import AnimatedCounter from '../components/AnimatedCounter';
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

const COLORS = {
    Positive: '#10b981',
    Neutral: '#64748b',
    Negative: '#f43f5e'
};

// ── AI Summary Components ────────────────────────────────────────────────────

const SEVERITY_STYLES = {
    high: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    low: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};
const PRIORITY_DOT = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
};

const LOADING_MESSAGES = [
    'Sending feedbacks to Gemini AI...',
    'Analyzing sentiment patterns...',
    'Identifying key themes...',
    'Generating actionable insights...',
    'Almost ready...',
];

const AISummaryPanel = ({ onClose, onNewFeedback }) => {
    const [summaryState, setSummaryState] = useState('idle'); // idle | loading | success | error
    const [summaryData, setSummaryData] = useState(null);
    const [summaryMeta, setSummaryMeta] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('week');
    const [dateRangeLabel, setDateRangeLabel] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
    const [retryCountdown, setRetryCountdown] = useState(0);
    const [newFeedbacksSinceCache, setNewFeedbacksSinceCache] = useState(0);
    const isGeneratingRef = useRef(false);
    const retryIntervalRef = useRef(null);

    // Rotate loading messages while in progress
    useEffect(() => {
        if (summaryState !== 'loading') return;
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % LOADING_MESSAGES.length;
            setLoadingMsg(LOADING_MESSAGES[i]);
        }, 2000);
        return () => clearInterval(interval);
    }, [summaryState]);

    // Cleanup countdown on unmount
    useEffect(() => {
        return () => { if (retryIntervalRef.current) clearInterval(retryIntervalRef.current); };
    }, []);

    const startRetryCountdown = (seconds) => {
        setRetryCountdown(seconds);
        retryIntervalRef.current = setInterval(() => {
            setRetryCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(retryIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleGenerate = async (forceRefresh = false) => {
        if (isGeneratingRef.current || retryCountdown > 0) return;
        if (forceRefresh) setNewFeedbacksSinceCache(0);  // reset on force refresh
        isGeneratingRef.current = true;
        setSummaryState('loading');
        setSummaryData(null);
        setSummaryMeta(null);
        setErrorMsg('');
        setLoadingMsg(forceRefresh ? 'Force refreshing from Gemini AI...' : LOADING_MESSAGES[0]);
        try {
            const res = await api.post('/feedback/summary', {
                dateRange: selectedPeriod,
                forceRefresh,
            });
            setSummaryData(res.data.summary);
            // Calculate staleness diff — how many new feedbacks since cache was generated
            const staleDiff = (res.data.currentFeedbackCount || 0) - (res.data.feedbackCount || 0);
            setNewFeedbacksSinceCache(Math.max(0, staleDiff));
            setSummaryMeta({
                fromCache: res.data.fromCache,
                generatedAt: res.data.generatedAt,
                expiresAt: res.data.expiresAt,
                feedbackCount: res.data.feedbackCount,
            });
            setDateRangeLabel(res.data.dateRange || selectedPeriod);
            setSummaryState('success');
            if (res.data.fromCache) {
                toast.success('Loaded from cache instantly!', { duration: 2500 });
            } else {
                toast.success('Fresh summary generated!', { duration: 2500 });
            }
        } catch (err) {
            const retryAfter = err.response?.data?.retryAfter;
            const message = err.response?.data?.message || err.message || 'AI service error. Try again.';
            setErrorMsg(message);
            setSummaryState('error');
            if (err.response?.status === 429 && retryAfter) {
                startRetryCountdown(retryAfter);
                toast.error(`Rate limited. Auto-retry in ${retryAfter}s`, { duration: 5000 });
            } else {
                toast.error(message, { duration: 5000 });
            }
        } finally {
            isGeneratingRef.current = false;
        }
    };

    // Reset stale state and clear summary when switching periods
    const handlePeriodChange = (newPeriod) => {
        setSelectedPeriod(newPeriod);
        setNewFeedbacksSinceCache(0);
        setSummaryData(null);
        setSummaryMeta(null);
        setSummaryState('idle');
    };

    // Register stale increment callback so parent (AdminDashboard) can notify us via socket
    useEffect(() => {
        if (onNewFeedback) {
            onNewFeedback.current = () => {
                if (summaryState === 'success') {
                    setNewFeedbacksSinceCache(prev => prev + 1);
                }
            };
        }
        return () => {
            if (onNewFeedback) onNewFeedback.current = null;
        };
    }, [summaryState, onNewFeedback]);

    const periodOptions = [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Last 7 Days' },
        { value: 'month', label: 'Last 30 Days' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden"
        >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">AI Feedback Summary</h3>
                        {summaryState === 'success' && summaryMeta && (
                            <p className="text-xs text-slate-400">
                                Based on {summaryMeta.feedbackCount} feedbacks · {dateRangeLabel}
                            </p>
                        )}
                        {(summaryState === 'idle' || summaryState === 'error') ? (
                            <p className="text-xs text-slate-400">Generate an AI-powered analysis of your feedback data</p>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {summaryState === 'success' && (
                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={summaryState === 'loading' || retryCountdown > 0}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={12} className={summaryState === 'loading' ? 'animate-spin' : ''} /> Regenerate
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Period selector + Generate button */}
                {(summaryState === 'idle' || summaryState === 'error') && (
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-slate-400">Period:</span>
                        <div className="flex gap-2">
                            {periodOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handlePeriodChange(opt.value)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        selectedPeriod === opt.value
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={summaryState === 'loading' || retryCountdown > 0}
                            className="ml-auto flex items-center gap-2 bg-gradient-to-r from-violet-600 to-primary-600 hover:from-violet-500 hover:to-primary-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Sparkles size={16} />
                            {retryCountdown > 0 ? `⏳ Retry in ${retryCountdown}s` : summaryState === 'loading' ? 'Generating...' : 'Generate AI Summary'}
                        </button>
                    </div>
                )}

                {/* Error state */}
                {summaryState === 'error' && (
                    <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
                        <AlertTriangle size={16} className="flex-shrink-0" />
                        {errorMsg}
                    </div>
                )}

                {/* Loading state */}
                {summaryState === 'loading' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-300 text-sm">
                            <Loader2 size={16} className="animate-spin text-violet-400 flex-shrink-0" />
                            <span className="transition-all">{loadingMsg}</span>
                        </div>
                        {/* Skeleton rows */}
                        {[80, 60, 90].map((w, i) => (
                            <div key={i} className="animate-pulse">
                                <div className={`h-4 bg-white/10 rounded-lg`} style={{ width: `${w}%` }} />
                            </div>
                        ))}
                        <div className="animate-pulse grid grid-cols-2 gap-4">
                            <div className="h-24 bg-white/5 rounded-xl" />
                            <div className="h-24 bg-white/5 rounded-xl" />
                        </div>
                    </motion.div>
                )}

                {/* Success state — full summary render */}
                {summaryState === 'success' && summaryData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                        {/* Cache Status Indicator */}
                        {summaryMeta && (
                            <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                                {summaryMeta.fromCache ? (
                                    <>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                                            Served from cache
                                        </span>
                                        <span>·</span>
                                        <span>Generated {new Date(summaryMeta.generatedAt).toLocaleTimeString()}</span>
                                        <span>·</span>
                                        <span>Valid until {new Date(summaryMeta.expiresAt).toLocaleTimeString()}</span>
                                        {newFeedbacksSinceCache > 0 && (
                                            <>
                                                <span>·</span>
                                                <span className="text-amber-400 font-medium">
                                                    ⚠️ {newFeedbacksSinceCache} new since generation
                                                </span>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleGenerate(true)}
                                            disabled={summaryState === 'loading'}
                                            className="text-blue-400 hover:text-blue-300 underline ml-1 disabled:opacity-50"
                                        >
                                            Force refresh
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                                            Fresh from Gemini AI
                                        </span>
                                        <span>·</span>
                                        <span>Based on {summaryMeta.feedbackCount} feedbacks</span>
                                        <span>·</span>
                                        <span>Valid until {new Date(summaryMeta.expiresAt).toLocaleTimeString()}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Amber stale warning banner — shown when new feedbacks arrived since cache */}
                        {newFeedbacksSinceCache > 0 && (
                            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-amber-400 text-lg">⚠️</span>
                                    <div>
                                        <p className="text-amber-400 font-medium text-sm">
                                            {newFeedbacksSinceCache} new feedback{newFeedbacksSinceCache > 1 ? 's' : ''} submitted since this summary was generated
                                        </p>
                                        <p className="text-white/50 text-xs mt-0.5">
                                            This summary may not reflect the latest data
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleGenerate(true)}
                                    disabled={summaryState === 'loading'}
                                    className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ml-4 disabled:opacity-50"
                                >
                                    🔄 Regenerate with latest
                                </button>
                            </div>
                        )}

                        {/* Period selector (compact) for re-generation */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">Period:</span>
                            {periodOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handlePeriodChange(opt.value)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                        selectedPeriod === opt.value
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Key Insight — gold border */}
                        {summaryData.keyInsight && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                                className="relative rounded-2xl overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.05) 100%)', border: '1px solid rgba(251,191,36,0.25)' }}
                            >
                                <div className="px-5 py-4">
                                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        💡 Key Insight
                                    </p>
                                    <p className="text-white font-medium leading-relaxed">{summaryData.keyInsight}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Overview */}
                        {summaryData.overview && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">📋 Overview</p>
                                <p className="text-slate-300 text-sm leading-relaxed">{summaryData.overview}</p>
                            </motion.div>
                        )}

                        {/* Complaints + Praises — side by side */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {/* Top Complaints */}
                            <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-4">
                                <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-3">🔴 Top Complaints</p>
                                <div className="space-y-3">
                                    {(summaryData.topComplaints || []).map((c, i) => (
                                        <div key={i} className="border-l-2 border-rose-500/40 pl-3">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-medium text-white">{c.issue}</span>
                                                {c.severity && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${SEVERITY_STYLES[c.severity?.toLowerCase()] || SEVERITY_STYLES.low}`}>
                                                        {c.severity}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>
                                            {c.count > 0 && <p className="text-xs text-slate-500 mt-0.5">~{c.count} mentions</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Praises */}
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">🟢 Top Praises</p>
                                <div className="space-y-3">
                                    {(summaryData.topPraises || []).map((p, i) => (
                                        <div key={i} className="border-l-2 border-emerald-500/40 pl-3">
                                            <span className="text-sm font-medium text-white">{p.feature}</span>
                                            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{p.description}</p>
                                            {p.count > 0 && <p className="text-xs text-slate-500 mt-0.5">~{p.count} mentions</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Action Items */}
                        {summaryData.actionItems?.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">⚡ Action Items</p>
                                <div className="space-y-2">
                                    {summaryData.actionItems.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${PRIORITY_DOT[item.priority?.toLowerCase()] || PRIORITY_DOT.low}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${SEVERITY_STYLES[item.priority?.toLowerCase()] || SEVERITY_STYLES.low}`}>
                                                        {item.priority}
                                                    </span>
                                                    <span className="text-sm font-medium text-white">{item.action}</span>
                                                </div>
                                                {item.rationale && <p className="text-xs text-slate-400 leading-relaxed">{item.rationale}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

// ── Main Dashboard Component ─────────────────────────────────────────────────
const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [filters, setFilters] = useState({
        search: '', sentiment: '', category: '', rating: '',
        priority: '', status: '', language: '', inputMode: '',
        startDate: '', endDate: '', isCritical: '', hasEmoji: '', userType: ''
    });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    // Real-time state
    const [socketConnected, setSocketConnected] = useState(false);
    const [newFeedbackId, setNewFeedbackId] = useState(null);
    const [liveStats, setLiveStats] = useState(null); // overrides stats KPIs when socket updates

    // AI Summary state
    const [showAISummary, setShowAISummary] = useState(false);

    // Export state
    const [exportOpen, setExportOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState(null); // 'pdf' | 'csv' | null
    const exportRef = useRef(null);

    // Fetch dashboard data
    const aiSummaryCallbackRef = useRef(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, feedbacksRes, trendsRes] = await Promise.all([
                api.get('/feedback/stats'),
                api.get('/feedback', { params: { page, limit: 10, ...filters } }),
                api.get('/feedback/trends', { params: { days: 30 } })
            ]);
            setStats(statsRes.data?.stats || {});
            setFeedbacks(feedbacksRes.data?.feedback || []);
            setPagination(feedbacksRes.data?.pagination || {});
            setTrends(trendsRes.data?.trends || []);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Close export dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Export handler
    const handleExport = async (type) => {
        setExportLoading(type);
        setExportOpen(false);
        try {
            const token = localStorage.getItem('token');
            const BACKEND = 'https://feedscope-backend.onrender.com';
            const res = await fetch(`${BACKEND}/api/export/${type}?period=week`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Export failed');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = type === 'pdf'
                ? `FeedScope-Report-${new Date().toISOString().split('T')[0]}.pdf`
                : `FeedScope-Data-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(type === 'pdf' ? '📄 PDF report downloaded!' : '📊 CSV data downloaded!');
        } catch (err) {
            toast.error(err.message || 'Export failed. Please try again.');
        } finally {
            setExportLoading(null);
        }
    };

    // ── Socket.io — admin only ────────────────────────────────────────────────
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        const socket = connectSocket();

        const handleConnect = () => {
            setSocketConnected(true);
            socket.emit('join:admin'); // Must re-join room on reconnect
        };
        const handleDisconnect = () => setSocketConnected(false);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        
        if (socket.connected) {
            handleConnect(); // Initialize if already connected
        }

        socket.on('feedback:new', ({ feedback, stats: newStats }) => {
            // Prepend new feedback to top of table (avoid duplicates on reconnect)
            setFeedbacks(prev => {
                if (prev.some(f => String(f._id) === String(feedback._id))) return prev;
                return [feedback, ...prev];
            });

            // Update live stats for KPI cards
            setLiveStats(prev => ({
                ...prev,
                totalFeedback: newStats.totalCount,
                criticalCount: newStats.criticalCount,
                averageRating: parseFloat(newStats.avgRating),
            }));

            // Flash the new row
            setNewFeedbackId(String(feedback._id));
            setTimeout(() => setNewFeedbackId(null), 3000);

            // Toast notification
            toast.custom((t) => (
                <div className={`bg-slate-900/95 backdrop-blur border border-white/15 rounded-xl p-4 flex items-center gap-3 shadow-2xl transition-all ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-2xl">🔔</span>
                    <div>
                        <p className="text-white font-medium text-sm">New feedback received!</p>
                        <p className="text-slate-400 text-xs">{feedback.sentimentLabel} · {feedback.categoryUserSelected}</p>
                    </div>
                </div>
            ), { duration: 4000, position: 'top-right' });

            // Notify AI Summary panel to increment stale counter (Option B)
            if (aiSummaryCallbackRef.current) aiSummaryCallbackRef.current();
        });

        socket.on('feedback:updated', (updatedData) => {
            // Updated feedback event (e.g. user claimed ticket)
            setFeedbacks(prev => prev.map(f => {
                if (String(f._id) === String(updatedData._id)) {
                    return { ...f, ...updatedData };
                }
                return f;
            }));
            
            // Flash row momentarily to show update
            setNewFeedbackId(String(updatedData._id));
            setTimeout(() => setNewFeedbackId(null), 1500);
            
            // If they just linked an account, notify admin
            if (updatedData.userName) {
                toast.success(`Ticket ${updatedData.ticketId} linked to ${updatedData.userName}`);
            }
        });

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('feedback:new');
            socket.off('feedback:updated');
            disconnectSocket();
        };
    }, [user]);

    // Merge live stats over fetched stats
    const displayStats = liveStats ? { ...stats, ...liveStats } : stats;

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            return (
                <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
                    <p className="text-slate-300 text-xs mb-1">{label}</p>
                    {payload.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-white">{entry.name}: {entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
                    >
                        Analytics Dashboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="text-slate-400 mt-1"
                    >
                        Real-time insights on user feedback and sentiment
                    </motion.p>
                </div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                    {/* Live connection indicator */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                        {socketConnected
                            ? <><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400">Live</span></>
                            : <><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-rose-400">Reconnecting...</span></>
                        }
                    </div>

                    {/* AI Summary toggle */}
                    <button
                        onClick={() => setShowAISummary(s => !s)}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-600/80 to-primary-600/80 hover:from-violet-600 hover:to-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-violet-500/20"
                    >
                        <Sparkles size={15} />
                        {showAISummary ? 'Hide AI Insights' : 'AI Insights'}
                        <ChevronDown size={14} className={`transition-transform ${showAISummary ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportOpen(o => !o)}
                            disabled={exportLoading !== null}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-xl transition-all text-sm font-medium disabled:opacity-60"
                        >
                            {exportLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{exportLoading === 'pdf' ? 'Generating PDF…' : 'Exporting CSV…'}</span>
                                </>
                            ) : (
                                <>
                                    <Download size={15} />
                                    <span>Export</span>
                                    <ChevronDown size={13} className={`transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} />
                                </>
                            )}
                        </button>

                        {exportOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute right-0 top-full mt-2 w-52 bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                            >
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
                                >
                                    <span className="text-xl">📄</span>
                                    <div>
                                        <div className="text-sm font-medium text-white">Export as PDF</div>
                                        <div className="text-xs text-white/40">Full formatted report</div>
                                    </div>
                                </button>
                                <div className="border-t border-white/10" />
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
                                >
                                    <span className="text-xl">📊</span>
                                    <div>
                                        <div className="text-sm font-medium text-white">Export as CSV</div>
                                        <div className="text-xs text-white/40">Raw data for spreadsheets</div>
                                    </div>
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* AI Summary Panel */}
            <AnimatePresence>
                {showAISummary && (
                    <AISummaryPanel
                        onClose={() => setShowAISummary(false)}
                        onNewFeedback={aiSummaryCallbackRef}
                    />
                )}
            </AnimatePresence>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    title="Total Feedback"
                    value={displayStats?.totalFeedback || 0}
                    icon={MessageSquare} color="text-primary-400" delay={0.1}
                    live={!!liveStats?.totalFeedback}
                />
                <StatCard
                    title="Avg Rating"
                    value={displayStats?.averageRating?.toFixed(1) || '0.0'}
                    icon={Star} color="text-yellow-400" suffix="/ 5.0" delay={0.2}
                />
                <StatCard
                    title="Critical Issues"
                    value={displayStats?.criticalCount || 0}
                    icon={AlertTriangle} color="text-rose-400" delay={0.3}
                    live={!!liveStats?.criticalCount}
                />
                <StatCard title="Response Rate" value={85} icon={Zap} color="text-emerald-400" suffix="%" delay={0.4} />
                <StatCard title="Emoji Feedback" value={displayStats?.emojiCount || 0} icon={SmilePlus} color="text-violet-400" delay={0.5} />
                <StatCard title="AI Suggestions" value={displayStats?.aiSuggestionsCount || 0} icon={Bot} color="text-cyan-400" delay={0.6} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <GlassCard className="col-span-2 h-[400px]" hoverEffect>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">Sentiment Trends</h3>
                    </div>
                    {trends?.length > 0 ? (
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPositive)" />
                                    <Area type="monotone" dataKey="neutral" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorNeutral)" />
                                    <Area type="monotone" dataKey="negative" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorNegative)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[300px]">
                            <p className="text-slate-400 text-sm">No trend data available yet</p>
                        </div>
                    )}
                </GlassCard>

                {/* Right column charts */}
                <div className="flex flex-col gap-4">
                    <GlassCard hoverEffect>
                        <h3 className="text-base font-semibold text-white mb-4">Sentiment Distribution</h3>
                        <div className="h-[160px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Positive', value: displayStats?.sentimentBreakdown?.Positive || 0 },
                                        { name: 'Neutral', value: displayStats?.sentimentBreakdown?.Neutral || 0 },
                                        { name: 'Negative', value: displayStats?.sentimentBreakdown?.Negative || 0 },
                                    ]} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                                        <Cell fill={COLORS.Positive} />
                                        <Cell fill={COLORS.Neutral} />
                                        <Cell fill={COLORS.Negative} />
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">
                                        <AnimatedCounter value={displayStats?.totalFeedback || 0} />
                                    </p>
                                    <p className="text-xs text-slate-400">Total</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-3 mt-2">
                            {Object.entries(COLORS).map(([name, color]) => (
                                <div key={name} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-xs text-slate-300">{name}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard hoverEffect>
                        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                            <SmilePlus size={16} className="text-violet-400" /> Emoji Sentiment
                        </h3>
                        <div className="h-[160px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Positive 😊', value: displayStats?.emojiSentimentBreakdown?.positive || 0 },
                                        { name: 'Neutral 😐', value: displayStats?.emojiSentimentBreakdown?.neutral || 0 },
                                        { name: 'Negative 😡', value: displayStats?.emojiSentimentBreakdown?.negative || 0 },
                                    ]} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                                        <Cell fill="#10b981" />
                                        <Cell fill="#64748b" />
                                        <Cell fill="#f43f5e" />
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{displayStats?.emojiCount || 0}</p>
                                    <p className="text-xs text-slate-400">Emoji</p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Filter Bar */}
            <GlassCard className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1">
                        <Input
                            placeholder="Search feedback..."
                            icon={Search}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="bg-dark-800/50"
                        />
                    </div>
                    <select className="input-premium" value={filters.userType} onChange={(e) => setFilters({ ...filters, userType: e.target.value })}>
                        <option value="">All Users &amp; Guests</option>
                        <option value="registered">Registered Users</option>
                        <option value="guest">Guest / Anonymous</option>
                    </select>
                    <select className="input-premium" value={filters.sentiment} onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}>
                        <option value="">All Sentiments</option>
                        <option value="Positive">Positive</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Negative">Negative</option>
                    </select>
                    <select className="input-premium" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
                        <option value="">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <select className="input-premium" value={filters.hasEmoji} onChange={(e) => setFilters({ ...filters, hasEmoji: e.target.value })}>
                        <option value="">All Emoji</option>
                        <option value="true">Has Emoji 😊</option>
                        <option value="false">No Emoji</option>
                    </select>
                    <select className="input-premium" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Statuses</option>
                        <option value="New">New</option>
                        <option value="In Review">In Review</option>
                        <option value="Being Resolved">Being Resolved</option>
                        <option value="Resolved">Resolved</option>
                        <option value="__awaiting">⏳ Awaiting Resolution</option>
                    </select>
                </div>
            </GlassCard>

            {/* Feedback Table */}
            <GlassCard className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/5 text-left">
                            <tr>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Feedback</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Semantics</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Emoji</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rating</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {feedbacks.map((item, idx) => {
                                const isNew = String(item._id) === newFeedbackId;
                                return (
                                    <motion.tr
                                        key={item._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                                        onClick={() => setSelectedFeedback(item)}
                                        className={`group transition-all duration-500 cursor-pointer ${
                                            isNew ? 'bg-blue-500/15 border-l-2 border-blue-400' : 'hover:bg-white/5'
                                        }`}
                                    >
                                        {/* Ticket ID + [NEW] badge */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {item.ticketId ? (
                                                    <span className="font-mono text-xs text-primary-400 bg-primary-500/10 px-2 py-1 rounded-lg">
                                                        {item.ticketId}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700 text-xs">—</span>
                                                )}
                                                {isNew && (
                                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full animate-pulse font-medium">
                                                        NEW
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                                    item.userId ? 'bg-gradient-to-br from-primary-500 to-accent-purple' : 'bg-slate-700'
                                                }`}>
                                                    {(item.userName || item.name || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">
                                                        {item.userName || item.name || 'Anonymous'}
                                                        {item.userId ? (
                                                            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">👤 Registered</span>
                                                        ) : (
                                                            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">🔒 Guest</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{item.userEmail || item.email || 'No email'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm text-slate-300 line-clamp-2 max-w-xs">{item.feedbackOriginalText}</p>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap space-y-2">
                                            <div className="flex gap-2 flex-wrap items-center">
                                                <StatusBadge
                                                    status={item.sentimentLabel}
                                                    variant={item.sentimentLabel === 'Positive' ? 'success' : item.sentimentLabel === 'Negative' ? 'error' : 'neutral'}
                                                />
                                                {item.isCritical && <StatusBadge status="Critical" variant="high" icon={AlertTriangle} />}
                                                {item.sentimentConflict && <span title="Conflict detected" className="text-amber-400 text-sm">⚠️</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={10} className={i < item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {item.hasEmoji && item.emojiList?.length > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-base leading-none">{item.emojiList.slice(0, 2).join('')}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                        item.dominantEmojiSentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        item.dominantEmojiSentiment === 'negative' ? 'bg-rose-500/20 text-rose-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                    }`}>🔍</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-700 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {item.satisfactionRating ? (
                                                <span className="text-yellow-400 text-sm">
                                                    {'★'.repeat(item.satisfactionRating)}{'☆'.repeat(5 - item.satisfactionRating)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <StatusBadge status={item.status} variant="neutral" />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-400">
                                            View Details
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-sm text-slate-400">Page {page} of {pagination.pages || 1}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="!p-2">
                            <ChevronLeft size={16} />
                        </Button>
                        <Button variant="secondary" onClick={() => setPage(p => Math.min(pagination.pages || 1, p + 1))} disabled={page === pagination.pages} className="!p-2">
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </GlassCard>

            {/* Feedback Modal */}
            {selectedFeedback && (
                <FeedbackModal
                    feedback={selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                    onUpdateStatus={(id, status, updatedFeedback) => {
                        setFeedbacks(prev => prev.map(f => f._id === id ? (updatedFeedback || { ...f, status }) : f));
                        setSelectedFeedback(updatedFeedback || { ...selectedFeedback, status });
                    }}
                />
            )}
        </div>
    );
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, suffix = '', delay, live = false }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
        <GlassCard hoverEffect className={live ? 'ring-1 ring-blue-400/30' : ''}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                        {title}
                        {live && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                        <h4 className="text-3xl font-bold text-white">
                            <AnimatedCounter value={Number(value) || 0} />
                        </h4>
                        <span className="text-sm text-slate-500">{suffix}</span>
                    </div>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
                    <Icon size={24} />
                </div>
            </div>
        </GlassCard>
    </motion.div>
);

export default AdminDashboard;
