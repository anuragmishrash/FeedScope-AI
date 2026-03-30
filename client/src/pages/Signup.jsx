import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Signup = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const { user, signup } = useAuth();
    const navigate = useNavigate();

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

        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords don't match");
        }

        setLoading(true);
        try {
            const result = await signup(formData.name, formData.email, formData.password);
            if (result.success) {
                toast.success('Account created successfully!');

                const pendingTicketId = localStorage.getItem('pendingTicketClaim');
                if (pendingTicketId) {
                    navigate('/claim-ticket', { replace: true });
                } else {
                    navigate('/my-feedbacks', { replace: true });
                }
            } else {
                toast.error(result.message || 'Signup failed');
            }
        } catch (error) {
            toast.error(error.message || 'Signup failed');
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
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px] animate-float" />
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-pink/20 rounded-full blur-[120px] animate-float-delayed" />

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
                        Get Started
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-400"
                    >
                        Create your account to track all your feedbacks
                    </motion.p>
                </div>

                <GlassCard className="backdrop-blur-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            icon={User}
                            required
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            icon={Mail}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            icon={Lock}
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            icon={Lock}
                            required
                        />

                        <Button
                            type="submit"
                            className="w-full py-3.5 text-base mt-2"
                            isLoading={loading}
                            icon={ArrowRight}
                        >
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-3">
                        <p className="text-slate-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
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

export default Signup;
