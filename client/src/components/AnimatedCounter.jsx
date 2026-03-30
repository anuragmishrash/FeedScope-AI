import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter — smoothly animates between numeric values
 * Uses ease-out cubic easing for a natural feel
 */
const AnimatedCounter = ({ value, duration = 800, prefix = '', suffix = '' }) => {
    const [display, setDisplay] = useState(value);
    const prevValue = useRef(value);

    useEffect(() => {
        if (prevValue.current === value) return;

        const start = prevValue.current;
        const end = value;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(start + (end - start) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
        prevValue.current = value;
    }, [value, duration]);

    return <span>{prefix}{display}{suffix}</span>;
};

export default AnimatedCounter;
