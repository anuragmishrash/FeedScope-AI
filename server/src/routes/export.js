import express from 'express';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import Feedback from '../models/Feedback.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/export/csv
 * @desc    Export feedback data as CSV (admin only)
 * @access  Private (Admin)
 */
router.get('/csv', authenticate, requireRole('admin'), async (req, res) => {
    try {
        // Get all feedback or apply filters from query
        const {
            sentiment = '',
            category = '',
            startDate = '',
            endDate = ''
        } = req.query;

        const query = {};

        if (sentiment) query.sentimentLabel = sentiment;
        if (category) query.categoryUserSelected = category;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });

        // Prepare data for CSV
        const csvData = feedbacks.map(fb => ({
            Date: new Date(fb.createdAt).toLocaleDateString(),
            Time: new Date(fb.createdAt).toLocaleTimeString(),
            Name: fb.name,
            Email: fb.email || 'N/A',
            Rating: fb.rating,
            Feedback: fb.feedbackOriginalText,
            Language: fb.language,
            InputMode: fb.inputMode,
            Category: fb.categoryUserSelected,
            CategoryPredicted: fb.categoryPredicted,
            Sentiment: fb.sentimentLabel,
            SentimentLevel: fb.sentimentLevel,
            Confidence: fb.hfConfidence,
            Emotions: fb.emotionDetected.join(', '),
            Priority: fb.priority,
            Critical: fb.isCritical ? 'Yes' : 'No',
            Spam: fb.isSpam ? 'Yes' : 'No',
            Status: fb.status
        }));

        // Convert to CSV
        const parser = new Parser();
        const csv = parser.parse(csvData);

        // Set headers for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=feedscope-export-${Date.now()}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export CSV'
        });
    }
});

/**
 * @route   POST /api/export/pdf
 * @desc    Generate PDF report (admin only)
 * @access  Private (Admin)
 */
router.post('/pdf', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        // Build query
        const query = {};
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Get statistics
        const total = await Feedback.countDocuments(query);
        const criticalCount = await Feedback.countDocuments({ ...query, isCritical: true });

        const sentimentCounts = await Feedback.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$sentimentLabel',
                    count: { $sum: 1 }
                }
            }
        ]);

        const avgRatingResult = await Feedback.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);
        const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=feedscope-report-${Date.now()}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Add title
        doc.fontSize(24).font('Helvetica-Bold').text('FeedScope AI', { align: 'center' });
        doc.fontSize(16).font('Helvetica').text('Feedback Analytics Report', { align: 'center' });
        doc.moveDown();

        // Add date range
        doc.fontSize(10).font('Helvetica').text(
            `Report Period: ${startDate ? new Date(startDate).toLocaleDateString() : 'All time'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}`,
            { align: 'center' }
        );
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Add summary statistics
        doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Feedback: ${total}`);
        doc.text(`Critical Feedback: ${criticalCount}`);
        doc.text(`Average Rating: ${avgRating.toFixed(2)} / 5.0`);
        doc.moveDown();

        // Add sentiment distribution
        doc.fontSize(12).font('Helvetica-Bold').text('Sentiment Distribution');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        sentimentCounts.forEach(item => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            doc.text(`${item._id || 'Unknown'}: ${item.count} (${percentage}%)`);
        });
        doc.moveDown();

        // Add recommendations
        doc.fontSize(12).font('Helvetica-Bold').text('Key Insights');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        if (criticalCount > 0) {
            doc.text(`• ${criticalCount} critical issues require immediate attention.`, { indent: 10 });
        }

        const negativeCount = sentimentCounts.find(s => s._id === 'Negative')?.count || 0;
        if (negativeCount > total * 0.3) {
            doc.text('• High negative sentiment detected. Review common issues and address concerns.', { indent: 10 });
        }

        if (avgRating < 3.5) {
            doc.text('• Below-average rating indicates room for improvement.', { indent: 10 });
        } else if (avgRating >= 4.0) {
            doc.text('• Strong positive rating reflects customer satisfaction.', { indent: 10 });
        }

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF report'
        });
    }
});

export default router;
