import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserHome from './pages/UserHome';
import AdminDashboard from './pages/AdminDashboard';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen">
                    <Navbar />
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* User routes */}
                        <Route
                            path="/user/home"
                            element={
                                <ProtectedRoute>
                                    <UserHome />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin routes */}
                        <Route
                            path="/admin/dashboard"
                            element={
                                <ProtectedRoute requireAdmin>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Redirect root based on auth */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                    </Routes>

                    {/* Toast notifications */}
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
                            success: {
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
