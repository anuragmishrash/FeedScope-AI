import { motion } from 'framer-motion';
import clsx from 'clsx';

const GlassCard = ({ children, className, hoverEffect = false, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={clsx(
                'glass-card p-6 relative group',
                hoverEffect && 'glass-interactive hover:-translate-y-1',
                className
            )}
            {...props}
        >
            {/* Ambient Background Glow on Hover */}
            {hoverEffect && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Subtle Border Gradient */}
            <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
        </motion.div>
    );
};

export default GlassCard;
