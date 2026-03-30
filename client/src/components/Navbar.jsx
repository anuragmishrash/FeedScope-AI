import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, BarChart2, Radio, Ticket, LayoutList } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './ui/Button';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/feedback');
    };

    if (location.pathname === '/login' || location.pathname === '/signup') return null;

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 w-full z-50 bg-dark-950/80 backdrop-blur-xl border-b border-white/5"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/feedback" className="flex items-center gap-2 group">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple">
                            <Radio className="w-5 h-5 text-white" />
                            <div className="absolute inset-0 bg-white/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                        </div>
                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            FeedScope AI
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {user ? (
                            <>
                                <NavLink to="/feedback" icon={Home} active={location.pathname === '/feedback' || location.pathname === '/user/home'}>
                                    Feedback Portal
                                </NavLink>
                                <NavLink to="/track" icon={Ticket} active={location.pathname.startsWith('/track')}>
                                    Track Feedback
                                </NavLink>
                                {user.role !== 'admin' && (
                                    <NavLink to="/my-feedbacks" icon={LayoutList} active={location.pathname === '/my-feedbacks'}>
                                        My Feedbacks
                                    </NavLink>
                                )}
                                {user.role === 'admin' && (
                                    <NavLink to="/admin/dashboard" icon={BarChart2} active={location.pathname === '/admin/dashboard'}>
                                        Analytics
                                    </NavLink>
                                )}
                            </>
                        ) : (
                            <>
                                <NavLink to="/feedback" icon={Home} active={location.pathname === '/feedback'}>
                                    Submit Feedback
                                </NavLink>
                                <NavLink to="/track" icon={Ticket} active={location.pathname.startsWith('/track')}>
                                    Track Feedback
                                </NavLink>
                            </>
                        )}
                    </div>


                    {/* User Actions */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-white">{user.name}</p>
                                    <p className="text-xs text-slate-400">{user.role === 'admin' ? 'Administrator' : 'User'}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="!p-2 hover:bg-rose-500/10 hover:text-rose-400"
                                >
                                    <LogOut size={18} />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login">
                                    <Button variant="ghost" className="text-sm">Sign In</Button>
                                </Link>
                                <Link to="/signup">
                                    <Button variant="primary" className="text-sm py-2 px-4 shadow-none">Get Started</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

const NavLink = ({ to, children, icon: Icon, active }) => (
    <Link to={to}>
        <div className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${active
                ? 'bg-white/10 text-white shadow-inner shadow-white/5'
                : 'text-slate-400 hover:text-white hover:bg-white/5'}
        `}>
            {Icon && <Icon size={16} className={active ? 'text-primary-400' : ''} />}
            {children}
        </div>
    </Link>
);

export default Navbar;
