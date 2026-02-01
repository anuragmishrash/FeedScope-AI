import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, User, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="glass-card m-4 px-6 py-4"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gradient">FeedScope AI</h1>
                        <p className="text-xs text-gray-400">Smart Feedback Insights</p>
                    </div>
                </Link>

                {/* Nav Links */}
                {user && (
                    <div className="flex items-center space-x-6">
                        {isAdmin ? (
                            <Link
                                to="/admin/dashboard"
                                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                <span>Dashboard</span>
                            </Link>
                        ) : (
                            <Link
                                to="/user/home"
                                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>Feedback</span>
                            </Link>
                        )}

                        <div className="flex items-center space-x-4 pl-6 border-l border-white/20">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary-400" />
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-gray-400">{user.role}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden md:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.nav>
    );
};

export default Navbar;
