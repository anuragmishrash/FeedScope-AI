import { motion } from 'framer-motion';
import clsx from 'clsx';

const Button = ({
    children,
    variant = 'primary',
    className,
    isLoading,
    icon: Icon,
    ...props
}) => {
    const variants = {
        primary: 'btn-premium',
        secondary: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300',
        danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 transition-all duration-300',
        ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white transition-colors duration-300'
    };

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                variants[variant],
                className
            )}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    {Icon && <Icon size={18} />}
                    {children}
                </>
            )}
        </motion.button>
    );
};

export default Button;
