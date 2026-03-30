import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — requires login.
 * - Unauthenticated users → /login (with location state for return redirect)
 * - Admins visiting user-only pages → /admin/dashboard
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
