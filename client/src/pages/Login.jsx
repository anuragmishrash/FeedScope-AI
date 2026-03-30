import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Already logged-in → redirect away
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/my-feedbacks', { replace: true });
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                toast.success('Welcome back to FeedScope!');

                // Read user role from the freshly stored user data
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

                if (storedUser.role === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                    return;
                }

                const pendingTicketId = localStorage.getItem('pendingTicketClaim');
                if (pendingTicketId) {
                    navigate('/claim-ticket', { replace: true });
                } else {
                    const redirectTo = location.state?.from || '/my-feedbacks';
                    navigate(redirectTo, { replace: true });
                }
            } else {
                toast.error(result.message || 'Invalid credentials');
            }
        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 mesh-gradient opacity-60 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

            {/* Floating Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px] animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px] animate-float-delayed" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="heading-hero text-4xl mb-2"
                    >
                        FeedScope AI
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-400"
                    >
                        Sign in to access your feedback dashboard
                    </motion.p>
                </div>

                <GlassCard className="backdrop-blur-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            icon={Mail}
                            required
                        />

                        <div className="space-y-1">
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                icon={Lock}
                                required
                            />
                            <div className="flex justify-end">
                                <Link to="#" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3.5 text-base"
                            isLoading={loading}
                            icon={ArrowRight}
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-3">
                        <p className="text-slate-400 text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Create account
                            </Link>
                        </p>
                        {/* Guest exit */}
                        <p className="text-slate-500 text-xs">
                            Just want to submit feedback?{' '}
                            <Link to="/feedback" className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1">
                                <MessageSquare size={11} /> Go to Feedback Form →
                            </Link>
                        </p>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default Login;
