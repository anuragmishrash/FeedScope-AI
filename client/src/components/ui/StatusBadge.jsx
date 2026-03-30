import { motion } from 'framer-motion';
import clsx from 'clsx';

const StatusBadge = ({ status, variant = 'neutral', icon: Icon, className }) => {
    const variants = {
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error',
        info: 'badge-info',
        neutral: 'badge-neutral',
        high: 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_-3px_rgba(239,68,68,0.2)]',
        medium: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_-3px_rgba(234,179,8,0.2)]',
        low: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_5px_-2px_rgba(59,130,246,0.3)]'
    };

    return (
        <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={clsx(
                "badge-premium gap-1.5 py-1 px-3",
                variants[variant] || variants.neutral,
                className
            )}
        >
            {Icon && <Icon size={12} strokeWidth={3} />}
            <span className="uppercase tracking-wider text-[10px] font-bold">{status}</span>
        </motion.span>
    );
};

export default StatusBadge;
