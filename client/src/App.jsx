import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Route guards
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserHome from './pages/UserHome';
import AdminDashboard from './pages/AdminDashboard';
import TrackFeedback from './pages/TrackFeedback';
import MyFeedbacks from './pages/MyFeedbacks';
import ClaimTicket from './pages/ClaimTicket';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen">
                    <Navbar />
                    <Routes>
                        {/* Public routes — no auth required */}
                        <Route path="/" element={<Navigate to="/feedback" replace />} />
                        <Route path="/feedback" element={<UserHome />} />
                        <Route path="/track" element={<TrackFeedback />} />
                        <Route path="/track/:ticketId" element={<TrackFeedback />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Legacy path support */}
                        <Route path="/user/home" element={<Navigate to="/feedback" replace />} />

                        {/* Protected user routes — login required, admin redirected away */}
                        <Route
                            path="/my-feedbacks"
                            element={
                                <ProtectedRoute>
                                    <MyFeedbacks />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/claim-ticket"
                            element={
                                <ProtectedRoute>
                                    <ClaimTicket />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin-only routes */}
                        <Route
                            path="/admin/dashboard"
                            element={
                                <AdminRoute>
                                    <AdminDashboard />
                                </AdminRoute>
                            }
                        />

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/feedback" replace />} />
                    </Routes>

                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#1e293b',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(10px)',
                            },
                            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                        }}
                    />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
