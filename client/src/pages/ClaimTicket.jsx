import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, CheckCircle2, AlertCircle, Loader2, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const ClaimTicket = () => {
    const [ticketId, setTicketId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Pre-fill from localStorage if arriving from post-submission flow
    useEffect(() => {
        const pending = localStorage.getItem('pendingTicketClaim');
        if (pending) setTicketId(pending);
    }, []);

    const handleClaim = async () => {
        if (!ticketId.trim()) {
            setError('Please enter your ticket ID.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.post('/feedback/claim', { ticketId: ticketId.trim().toUpperCase() });
            localStorage.removeItem('pendingTicketClaim');
            setSuccess(true);
            toast.success('Feedback linked to your account!');
            setTimeout(() => navigate('/my-feedbacks', { replace: true }), 1500);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to claim ticket. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        localStorage.removeItem('pendingTicketClaim');
        navigate('/my-feedbacks', { replace: true });
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 pt-24">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary-500/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Icon + heading */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-600/20 border border-primary-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/10">
                        <Ticket size={28} className="text-primary-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Link Feedback to Your Account</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Did you submit feedback before signing in?<br />
                        Enter your ticket ID to add it to your history.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                            Ticket ID
                        </label>
                        <input
                            type="text"
                            value={ticketId}
                            onChange={e => { setTicketId(e.target.value.toUpperCase()); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleClaim()}
                            placeholder="FSC-20240324-A7X2"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                        />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3"
                            >
                                <AlertCircle size={16} className="flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3"
                            >
                                <CheckCircle2 size={16} />
                                Linked! Redirecting to My Feedbacks…
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-3">
                        <button
                            onClick={handleClaim}
                            disabled={loading || success}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                            {loading ? 'Linking…' : 'Link to My Account'}
                        </button>
                        <button
                            onClick={handleSkip}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium py-3 px-4 rounded-xl transition-all text-sm"
                        >
                            <SkipForward size={15} /> Skip
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-500 pt-1">
                        ℹ️ You can also link tickets later from your{' '}
                        <Link to="/my-feedbacks" className="text-slate-400 hover:text-white transition-colors">
                            My Feedbacks
                        </Link>{' '}
                        page
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ClaimTicket;
