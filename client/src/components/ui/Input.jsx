import { motion } from 'framer-motion';
import clsx from 'clsx';

const Input = ({
    label,
    error,
    icon: Icon,
    className,
    containerClassName,
    ...props
}) => {
    return (
        <div className={clsx("w-full space-y-1.5", containerClassName)}>
            {label && (
                <label className="text-sm font-medium text-slate-300 ml-1">
                    {label}
                </label>
            )}

            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors duration-300">
                        <Icon size={18} />
                    </div>
                )}

                <input
                    className={clsx(
                        "input-premium",
                        Icon && "pl-11",
                        error && "border-rose-500/50 focus:border-rose-500 focus:shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]",
                        className
                    )}
                    {...props}
                />

                {/* Focus Glow Overlay */}
                <div className="absolute inset-0 rounded-xl bg-primary-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-rose-400 ml-1"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
};

export default Input;
