import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, isAdmin } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate(isAdmin ? '/admin/dashboard' : '/user/home');
        }
    }, [user, isAdmin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            toast.success('Login successful!');
            // Redirect will happen via AuthContext update
            setTimeout(() => {
                navigate(result.user?.role === 'admin' ? '/admin/dashboard' : '/user/home');
            }, 500);
        } else {
            toast.error(result.message || 'Login failed');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 md:p-12 w-full max-w-md relative z-10"
            >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/50">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
                <p className="text-gray-400 text-center mb-8">Sign in to your account</p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field pl-11"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pl-11"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                <span>Sign In</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Signup link */}
                <p className="text-center text-gray-400 mt-6">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                        Sign up
                    </Link>
                </p>

                {/* Demo credentials */}
                <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                    <p className="text-xs text-gray-400 text-center">
                        <strong className="text-primary-400">Admin Demo:</strong><br />
                        itsanuragmishra99@gmail.com / 987654321Anu
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
