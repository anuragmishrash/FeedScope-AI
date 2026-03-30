import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Optional authentication middleware.
 * If a valid token is present → attaches req.user.
 * If no token or invalid → sets req.user = null and continues (never rejects).
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-passwordHash');
        req.user = user || null;
    } catch {
        req.user = null; // invalid/expired token → treat as guest
    }
    next();
};

export default optionalAuth;
