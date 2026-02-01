import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    AlertTriangle,
    Star,
    MessageSquare,
    Download,
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import api from '../utils/api';
import FeedbackModal from '../components/FeedbackModal';
import { generateResponseSuggestion } from '../utils/responseGenerator';

const COLORS = {
    Positive: '#10b981',
    Neutral: '#6b7280',
    Negative: '#ef4444'
};

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        sentiment: '',
        category: '',
        rating: '',
        priority: '',
        status: '',
        language: '',
        inputMode: '',
        startDate: '',
        endDate: '',
        isCritical: ''
    });

    // Pagination
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 0 });

    useEffect(() => {
        fetchData();
    }, [filters, page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stats
            const statsRes = await api.get('/feedback/stats');
            setStats(statsRes.data.stats);

            // Fetch trends
            const trendsRes = await api.get('/feedback/trends?days=7');
            setTrends(processTrends(trendsRes.data.trends));

            // Fetch feedbacks with filters
            const feedbackRes = await api.get('/feedback', { params: { ...filters, page, limit: 10 } });
            setFeedbacks(feedbackRes.data.feedbacks);
            setPagination(feedbackRes.data.pagination);

        } catch (error) {
            toast.error('Failed to load dashboard data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const processTrends = (rawTrends) => {
        const dates = {};
        rawTrends.forEach(item => {
            if (!dates[item._id.date]) {
                dates[item._id.date] = { date: item._id.date, Positive: 0, Neutral: 0, Negative: 0 };
            }
            dates[item._id.date][item._id.sentiment] = item.count;
        });
        return Object.values(dates);
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/feedback/${id}/status`, { status });
            toast.success('Status updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/export/csv', {
                params: filters,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `feedscope-export-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Failed to export CSV');
        }
    };

    const handleExportPDF = async () => {
        try {
            const response = await api.post('/export/pdf', {
                startDate: filters.startDate,
                endDate: filters.endDate
            }, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `feedscope-report-${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('PDF report generated');
        } catch (error) {
            toast.error('Failed to generate PDF');
        }
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    // Process stats for charts
    const sentimentData = stats?.sentiment.map(item => ({
        name: item._id || 'Unknown',
        value: item.count
    })) || [];

    const categoryData = stats?.category.map(item => ({
        name: item._id,
        count: item.count
    })) || [];

    const criticalCount = stats?.criticalCount || 0;
    const totalCount = stats?.total || 0;

    return (
        <div className="px-4 py-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold mb-2">
                    <span className="text-gradient">Admin Dashboard</span>
                </h1>
                <p className="text-gray-400">Monitor and manage feedback insights</p>
            </motion.div>

            {/* Critical Alert */}
            {criticalCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-6 mb-6 border-l-4 border-red-500"
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">Critical Feedback Requires Attention</h3>
                            <p className="text-sm text-gray-400">
                                {criticalCount} critical issue{criticalCount !== 1 ? 's' : ''} need immediate review
                            </p>
                        </div>
                        <button
                            onClick={() => setFilters({ ...filters, isCritical: 'true' })}
                            className="btn-primary"
                        >
                            View Critical
                        </button>
                    </div>
                </motion.div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title="Total Feedback"
                    value={totalCount}
                    icon={<MessageSquare />}
                    color="blue"
                />
                <KPICard
                    title="Average Rating"
                    value={`${stats?.avgRating || 0} / 5`}
                    icon={<Star />}
                    color="yellow"
                />
                <KPICard
                    title="Critical Issues"
                    value={criticalCount}
                    icon={<AlertTriangle />}
                    color="red"
                />
                <KPICard
                    title="Positive Rate"
                    value={`${totalCount > 0 ? ((sentimentData.find(s => s.name === 'Positive')?.value || 0) / totalCount * 100).toFixed(1) : 0}%`}
                    icon={<TrendingUp />}
                    color="green"
                />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Sentiment Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-6"
                >
                    <h3 className="text-lg font-bold mb-4">Sentiment Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={sentimentData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {sentimentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Category Breakdown */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-6"
                >
                    <h3 className="text-lg font-bold mb-4">Category Breakdown</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={categoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }} />
                            <Bar dataKey="count" fill="#0ea5e9" />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Sentiment Trend */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 mb-8"
            >
                <h3 className="text-lg font-bold mb-4">Sentiment Trend (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }} />
                        <Legend />
                        <Line type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="Neutral" stroke="#6b7280" strokeWidth={2} />
                        <Line type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Filters & Search */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 mb-6"
            >
                <div className="flex items-center space-x-2 mb-4">
                    <Filter className="w-5 h-5 text-primary-400" />
                    <h3 className="font-bold">Filters & Search</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search feedback or email..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    {/* Sentiment Filter */}
                    <select
                        value={filters.sentiment}
                        onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                        className="input-field"
                    >
                        <option value="">All Sentiments</option>
                        <option value="Positive">Positive</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Negative">Negative</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="input-field"
                    >
                        <option value="">All Categories</option>
                        <option value="UI/UX Issue">UI/UX Issue</option>
                        <option value="Performance Issue">Performance Issue</option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Service Complaint">Service Complaint</option>
                        <option value="Pricing Concern">Pricing Concern</option>
                        <option value="Other">Other</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="input-field"
                    >
                        <option value="">All Status</option>
                        <option value="New">New</option>
                        <option value="In Review">In Review</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>

                    {/* Priority Filter */}
                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                        className="input-field"
                    >
                        <option value="">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    {/* Language Filter */}
                    <select
                        value={filters.language}
                        onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                        className="input-field"
                    >
                        <option value="">All Languages</option>
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                    </select>

                    {/* Date Range */}
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="input-field"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="input-field"
                        placeholder="End Date"
                    />
                </div>

                {/* Export Buttons */}
                <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-white/10">
                    <button onClick={handleExportCSV} className="btn-secondary flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                    <button onClick={handleExportPDF} className="btn-secondary flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Export PDF</span>
                    </button>
                </div>
            </motion.div>

            {/* Feedback Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Feedback</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Sentiment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Emotion</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Rating</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Priority</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium">Lang</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {feedbacks.map((feedback) => (
                                <tr
                                    key={feedback._id}
                                    onClick={() => setSelectedFeedback(feedback)}
                                    className="hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm">
                                        {new Date(feedback.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>
                                            <p className="font-medium">{feedback.name}</p>
                                            <p className="text-xs text-gray-400">{feedback.email || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm max-w-xs">
                                        <p className="truncate">{feedback.feedbackOriginalText}</p>
                                        <div className="flex items-center space-x-1 mt-1">
                                            {feedback.isCritical && <span className="text-xs text-red-400">🔥</span>}
                                            {feedback.isSpam && <span className="text-xs text-yellow-400">⚠️</span>}
                                            {feedback.inputMode === 'voice' && <span className="text-xs text-blue-400">🎙️</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{feedback.categoryUserSelected}</td>
                                    <td className="px-4 py-3">
                                        <span className={`badge ${feedback.sentimentLabel === 'Positive' ? 'badge-positive' :
                                                feedback.sentimentLabel === 'Negative' ? 'badge-negative' :
                                                    'badge-neutral'
                                            }`}>
                                            {feedback.sentimentLevel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {feedback.emotionDetected && feedback.emotionDetected.length > 0 ? (
                                            <span className={`badge ${feedback.emotionDetected[0] === 'Angry' ? 'badge-negative' :
                                                    feedback.emotionDetected[0] === 'Frustrated' ? 'badge-medium' :
                                                        feedback.emotionDetected[0] === 'Confused' ? 'badge-neutral' :
                                                            feedback.emotionDetected[0] === 'Happy' ? 'badge-positive' :
                                                                feedback.emotionDetected[0] === 'Satisfied' ? 'badge-positive' :
                                                                    'badge-neutral'
                                                }`}>
                                                {feedback.emotionDetected[0] === 'Angry' && '😡 '}
                                                {feedback.emotionDetected[0] === 'Frustrated' && '😤 '}
                                                {feedback.emotionDetected[0] === 'Confused' && '😕 '}
                                                {feedback.emotionDetected[0] === 'Happy' && '😄 '}
                                                {feedback.emotionDetected[0] === 'Satisfied' && '🙂 '}
                                                {feedback.emotionDetected[0] === 'Neutral' && '😐 '}
                                                {feedback.emotionDetected[0]}
                                            </span>
                                        ) : (
                                            <span className="badge badge-neutral">😐 Neutral</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {[...Array(feedback.rating)].map((_, i) => (
                                            <span key={i} className="text-yellow-400">★</span>
                                        ))}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`badge ${feedback.priority === 'High' ? 'badge-high' :
                                            feedback.priority === 'Medium' ? 'badge-medium' :
                                                'badge-low'
                                            }`}>
                                            {feedback.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{feedback.status}</td>
                                    <td className="px-4 py-3 text-sm uppercase">{feedback.language}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                        <p className="text-sm text-gray-400">
                            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, pagination.total)} of {pagination.total} results
                        </p>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm">
                                Page {page} of {pagination.pages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Feedback Modal */}
            {selectedFeedback && (
                <FeedbackModal
                    feedback={selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onGenerateResponse={generateResponseSuggestion}
                />
            )}
        </div>
    );
};

// KPI Card Component
const KPICard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        yellow: 'from-yellow-500 to-yellow-600',
        red: 'from-red-500 to-red-600',
        green: 'from-green-500 to-green-600'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center shadow-lg`}>
                    {icon}
                </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
            <p className="text-3xl font-bold">{value}</p>
        </motion.div>
    );
};

export default AdminDashboard;
