import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
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

    if (user.role !== 'admin') {
        // Logged in but not admin → back to feedback form
        return <Navigate to="/feedback" replace />;
    }

    return children;
};

export default AdminRoute;
