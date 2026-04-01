import express from 'express';
import Feedback from '../models/Feedback.js';
import SummaryCache from '../models/SummaryCache.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── Date filter helper ──────────────────────────────────────────────────────
const getDateFilter = (query) => {
    const { period, startDate, endDate } = query || {};
    
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }
        return { createdAt: dateFilter };
    }

    const now = new Date();
    switch (period) {
        case 'today':
            return { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } };
        case 'month':
            return { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        case 'week':
        default:
            return { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    }
};

const getPeriodLabel = (query) => {
    const { period, startDate, endDate } = query || {};
    if (startDate && endDate) return 'Custom Range';
    if (startDate) return 'Custom Start Date';
    if (endDate) return 'Custom End Date';
    
    switch (period) {
        case 'today': return 'Today';
        case 'month': return 'Last 30 Days';
        default: return 'Last 7 Days';
    }
};

const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (d) =>
    new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const renderStars = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);

// ─── Build PDF HTML ─────────────────────────────────────────────────────────
const buildPDFHTML = (feedbacks, stats, summary, query) => {
    const periodLabel = getPeriodLabel(query);
    const now = new Date();
    const dateStr = formatDate(now);
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const reportId = `FSC-RPT-${now.toISOString().split('T')[0].replace(/-/g, '')}`;

    // Date range string
    const dateFilter = getDateFilter(query);
    const gteObj = dateFilter.createdAt.$gte;
    const lteObj = dateFilter.createdAt.$lte;
    
    const fromDate = gteObj ? formatDate(gteObj) : '';
    const toDate = lteObj ? formatDate(lteObj) : dateStr;
    const periodDateRange = (query.period === 'today' && !query.startDate) 
        ? dateStr 
        : (fromDate ? `${fromDate} – ${toDate}` : toDate);

    // KPI calculations
    const totalFeedback = feedbacks.length;
    const avgRating = totalFeedback > 0
        ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / totalFeedback).toFixed(1)
        : '0.0';
    const criticalCount = feedbacks.filter(f => f.isCritical).length;
    const resolvedCount = feedbacks.filter(f => f.status === 'Resolved' || f.status === 'Closed').length;
    const responseRate = totalFeedback > 0 ? Math.round((resolvedCount / totalFeedback) * 100) : 0;
    const emojiCount = feedbacks.filter(f => f.hasEmoji).length;
    const aiSuggestionsCount = feedbacks.filter(f => f.suggestedResponse).length;

    // Sentiment breakdown
    const sentimentMap = {};
    feedbacks.forEach(f => {
        const key = f.sentimentLevel || f.sentimentLabel || 'Unknown';
        sentimentMap[key] = (sentimentMap[key] || 0) + 1;
    });
    const sentimentOrder = ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'];
    const sentimentRows = sentimentOrder
        .filter(k => sentimentMap[k])
        .map(k => {
            const count = sentimentMap[k];
            const pct = totalFeedback > 0 ? ((count / totalFeedback) * 100).toFixed(1) : '0.0';
            const colorClass = k.includes('Positive') ? 'color: #34d399' : k.includes('Negative') ? 'color: #f87171' : 'color: #94a3b8';
            return `<tr>
                <td style="${colorClass}; font-weight:600;">${k}</td>
                <td>${count}</td>
                <td>${pct}%</td>
            </tr>`;
        }).join('');

    // AI insights sections
    let aiSection = '';
    if (summary) {
        const s = summary.summary || summary;

        const complaintsHTML = Array.isArray(s.topComplaints)
            ? s.topComplaints.map((c, i) => `
                <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;">
                    <span style="background:rgba(239,68,68,0.2);color:#f87171;padding:2px 8px;border-radius:10px;font-size:11px;flex-shrink:0;">${i + 1}</span>
                    <div>
                        <div style="color:#f1f5f9;font-size:12px;font-weight:600;">${c.issue || c}</div>
                        ${c.severity ? `<span style="background:rgba(239,68,68,0.15);color:#f87171;padding:1px 8px;border-radius:6px;font-size:10px;">${c.severity}</span>` : ''}
                    </div>
                </div>`).join('')
            : `<p style="color:#64748b;">No complaints data.</p>`;

        const praisesHTML = Array.isArray(s.topPraises)
            ? s.topPraises.map((p, i) => `
                <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;">
                    <span style="background:rgba(16,185,129,0.2);color:#34d399;padding:2px 8px;border-radius:10px;font-size:11px;flex-shrink:0;">${i + 1}</span>
                    <div>
                        <div style="color:#f1f5f9;font-size:12px;font-weight:600;">${p.feature || p}</div>
                        ${p.count ? `<span style="background:rgba(16,185,129,0.15);color:#34d399;padding:1px 8px;border-radius:6px;font-size:10px;">× ${p.count}</span>` : ''}
                    </div>
                </div>`).join('')
            : `<p style="color:#64748b;">No praises data.</p>`;

        const actionHTML = Array.isArray(s.actionItems)
            ? s.actionItems.map(a => {
                const p = (a.priority || 'medium').toLowerCase();
                const pColor = p === 'high' ? '#f87171' : p === 'medium' ? '#fbbf24' : '#34d399';
                return `<tr>
                    <td style="color:${pColor};font-weight:700;text-transform:capitalize;">${a.priority || 'Medium'}</td>
                    <td>${a.action || a}</td>
                    <td style="color:#94a3b8;font-size:11px;">${a.rationale || '—'}</td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="3" style="text-align:center;color:#64748b;">No action items.</td></tr>';

        aiSection = `
        <div style="page-break-before: always; padding: 40px; min-height: 100vh;">
            <div class="section-header">
                <span class="section-number">02</span>
                <h2>AI-Generated Insights</h2>
                <span style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);padding:4px 12px;border-radius:20px;font-size:10px;">Powered by Gemini 2.5 Flash</span>
            </div>

            ${s.keyInsight ? `
            <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.15));border:1px solid rgba(124,58,237,0.4);border-left:4px solid #7c3aed;border-radius:12px;padding:24px;margin-bottom:28px;">
                <div style="color:#7c3aed;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">KEY INSIGHT</div>
                <p style="color:#f1f5f9;font-size:15px;font-weight:500;line-height:1.7;margin:0;">${s.keyInsight}</p>
            </div>` : ''}

            ${s.overview ? `
            <div style="margin-bottom:28px;">
                <h3 class="subsection-h3">Executive Overview</h3>
                <p style="color:#cbd5e1;line-height:1.8;font-size:12px;">${s.overview}</p>
            </div>` : ''}

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0;">
                <div>
                    <h3 style="font-size:14px;font-weight:600;color:#f87171;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">Top Complaints</h3>
                    ${complaintsHTML}
                </div>
                <div>
                    <h3 style="font-size:14px;font-weight:600;color:#34d399;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">Top Praises</h3>
                    ${praisesHTML}
                </div>
            </div>

            <div style="margin-bottom:28px;">
                <h3 class="subsection-h3">Recommended Action Items</h3>
                <table class="data-table">
                    <tr><th>Priority</th><th>Action</th><th>Rationale</th></tr>
                    ${actionHTML}
                </table>
            </div>
        </div>`;
    } else {
        aiSection = `
        <div style="page-break-before: always; padding: 40px;">
            <div class="section-header">
                <span class="section-number">02</span>
                <h2>AI-Generated Insights</h2>
            </div>
            <div style="background:rgba(148,163,184,0.1);border:1px dashed rgba(148,163,184,0.3);border-radius:10px;padding:40px;text-align:center;color:#64748b;">
                <p style="font-size:16px;margin-bottom:8px;">No AI Summary available for this period.</p>
                <p style="font-size:12px;">Generate an AI Summary from the dashboard to include Gemini insights in future reports.</p>
            </div>
        </div>`;
    }

    // Feedback table rows
    const feedbackRows = feedbacks.map(f => {
        const sentLevel = (f.sentimentLevel || f.sentimentLabel || '').toLowerCase().replace(/ /g, '-');
        const sentimentStyle = sentLevel.includes('positive')
            ? 'background:rgba(16,185,129,0.2);color:#34d399;'
            : sentLevel.includes('negative')
            ? 'background:rgba(239,68,68,0.2);color:#f87171;'
            : 'background:rgba(148,163,184,0.2);color:#94a3b8;';
        const text = (f.feedbackOriginalText || '').substring(0, 80);
        return `<tr>
            <td style="font-family:'Courier New',monospace;font-size:10px;color:#a78bfa;">${f.ticketId || '—'}</td>
            <td>${formatDate(f.createdAt)}</td>
            <td style="max-width:200px;word-break:break-word;">${text}${(f.feedbackOriginalText || '').length > 80 ? '…' : ''}</td>
            <td><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;${sentimentStyle}">${f.sentimentLevel || f.sentimentLabel || '—'}</span></td>
            <td>${f.categoryUserSelected || '—'}</td>
            <td><span style="padding:2px 8px;border-radius:10px;font-size:10px;background:rgba(124,58,237,0.2);color:#a78bfa;">${f.status || '—'}</span></td>
            <td style="color:#fbbf24;">${renderStars(f.rating || 0)}</td>
            <td>${f.userName || 'Guest'}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f1117; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6; }

/* ── Cover Page ── */
.cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px 40px; text-align: center; position: relative; }
.accent-bar { position: fixed; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #7c3aed, #4f46e5, #0ea5e9); }
.logo-icon { width: 72px; height: 72px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 800; color: white; margin: 0 auto 16px; }
.logo-title { font-size: 42px; font-weight: 800; margin-bottom: 8px; color: #f1f5f9; }
.logo-title span { color: #7c3aed; }
.tagline { color: #94a3b8; font-size: 16px; margin-bottom: 48px; }
.report-title-box { background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.35); border-radius: 16px; padding: 32px 48px; margin-bottom: 40px; width: 100%; max-width: 560px; }
.report-title-box h2 { font-size: 26px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
.period-badge { display: inline-block; background: rgba(124,58,237,0.25); color: #a78bfa; padding: 6px 16px; border-radius: 20px; font-size: 13px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 500px; margin-bottom: 48px; }
.meta-item { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; text-align: left; }
.meta-label { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.meta-value { color: #f1f5f9; font-weight: 600; font-size: 13px; }
.meta-value.highlight { color: #a78bfa; font-size: 22px; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(124,58,237,0.15); color: #94a3b8; text-align: center; padding: 12px; font-size: 11px; border-top: 1px solid rgba(124,58,237,0.25); }

/* ── Sections ── */
.section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.section-number { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
.section-header h2 { font-size: 22px; font-weight: 700; color: #f1f5f9; flex: 1; }
.subsection-h3 { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06); }

/* ── KPI Grid ── */
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
.kpi-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 20px; text-align: center; }
.kpi-card.critical { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.06); }
.kpi-label { color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.kpi-value { font-size: 32px; font-weight: 800; color: #f1f5f9; }
.kpi-value.red { color: #f87171; }
.kpi-sub { font-size: 14px; color: #64748b; font-weight: 400; }

/* ── Tables ── */
.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.data-table th { background: rgba(124,58,237,0.18); color: #a78bfa; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.data-table td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-size: 12px; vertical-align: top; }
.feedback-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.feedback-table th { background: rgba(124,58,237,0.18); color: #a78bfa; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
.feedback-table td { padding: 7px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; vertical-align: top; }
</style>
</head>
<body>

<!-- ══ PAGE 1: COVER ══════════════════════════════════════════════════════ -->
<div class="cover-page">
    <div class="accent-bar"></div>
    <div class="logo-icon">F</div>
    <h1 class="logo-title">Feed<span>Scope</span> AI</h1>
    <p class="tagline">Smart Feedback Intelligence Platform</p>

    <div class="report-title-box">
        <h2>Feedback Intelligence Report</h2>
        <div class="period-badge">${periodLabel} · ${periodDateRange}</div>
    </div>

    <div class="meta-grid">
        <div class="meta-item">
            <span class="meta-label">Generated</span>
            <span class="meta-value">${dateStr} · ${timeStr}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Prepared for</span>
            <span class="meta-value">Administrator</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Total Feedbacks</span>
            <span class="meta-value highlight">${totalFeedback}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Report ID</span>
            <span class="meta-value">${reportId}</span>
        </div>
    </div>

    <div class="bottom-bar">Confidential — FeedScope AI Analytics</div>
</div>

<!-- ══ PAGE 2: KPI DASHBOARD ════════════════════════════════════════════ -->
<div style="page-break-before: always; padding: 40px; min-height: 100vh;">
    <div class="section-header">
        <span class="section-number">01</span>
        <h2>Performance Overview</h2>
    </div>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">Total Feedback</div>
            <div class="kpi-value">${totalFeedback}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Avg Rating</div>
            <div class="kpi-value">${avgRating}<span class="kpi-sub"> /5.0</span></div>
        </div>
        <div class="kpi-card critical">
            <div class="kpi-label">Critical Issues</div>
            <div class="kpi-value red">${criticalCount}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Response Rate</div>
            <div class="kpi-value">${responseRate}<span class="kpi-sub">%</span></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Emoji Feedback</div>
            <div class="kpi-value">${emojiCount}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">AI Suggestions</div>
            <div class="kpi-value">${aiSuggestionsCount}</div>
        </div>
    </div>

    <div style="margin-bottom:28px;">
        <h3 class="subsection-h3">Sentiment Distribution</h3>
        <table class="data-table">
            <tr><th>Sentiment Level</th><th>Count</th><th>Percentage</th></tr>
            ${sentimentRows || '<tr><td colspan="3" style="text-align:center;color:#64748b;">No sentiment data available.</td></tr>'}
        </table>
    </div>
</div>

<!-- ══ PAGE 3: AI INSIGHTS ═══════════════════════════════════════════════ -->
${aiSection}

<!-- ══ PAGE 4: FEEDBACK LOG ══════════════════════════════════════════════ -->
<div style="page-break-before: always; padding: 40px;">
    <div class="section-header">
        <span class="section-number">03</span>
        <h2>Complete Feedback Log</h2>
        <span style="background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.3);padding:4px 12px;border-radius:20px;font-size:11px;">${feedbacks.length} entries</span>
    </div>
    <table class="feedback-table">
        <thead>
            <tr>
                <th>Ticket ID</th><th>Date</th><th>Feedback</th><th>Sentiment</th>
                <th>Category</th><th>Status</th><th>Rating</th><th>User</th>
            </tr>
        </thead>
        <tbody>
            ${feedbackRows || '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:20px;">No feedback data for this period.</td></tr>'}
        </tbody>
    </table>
</div>

</body>
</html>`;
};

// ─── CSV Builder ─────────────────────────────────────────────────────────────
const buildCSV = (feedbacks) => {
    const headers = [
        'Ticket ID', 'Date', 'Time', 'Feedback Text', 'Sentiment', 'Sentiment Level',
        'Emotion', 'Category', 'Priority', 'Status', 'Rating',
        'Has Emoji', 'Sentiment Conflict', 'User Name', 'User Email',
        'User Type', 'Resolved At'
    ];

    const esc = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };

    const rows = feedbacks.map(f => [
        f.ticketId || '',
        new Date(f.createdAt).toLocaleDateString('en-IN'),
        new Date(f.createdAt).toLocaleTimeString('en-IN'),
        f.feedbackOriginalText || '',
        f.sentimentLabel || '',
        f.sentimentLevel || '',
        Array.isArray(f.emotionDetected) ? f.emotionDetected.join('; ') : (f.emotionDetected || ''),
        f.categoryUserSelected || '',
        f.priority || '',
        f.status || '',
        f.rating || '',
        f.hasEmoji ? 'Yes' : 'No',
        f.sentimentConflict ? 'Yes' : 'No',
        f.userName || 'Guest',
        f.userEmail || '',
        f.userId ? 'Registered' : 'Guest',
        f.resolvedAt ? new Date(f.resolvedAt).toLocaleString('en-IN') : '',
    ].map(esc).join(','));

    // prepend UTF-8 BOM so Excel opens it correctly without breaking special characters
    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
};

// ─── GET /api/export/pdf ─────────────────────────────────────────────────────
router.get('/pdf', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const dateFilter = getDateFilter(req.query);
        const cachePeriod = req.query.period || 'week'; // Used only for SummaryCache fallback

        const [feedbacks, cachedSummary] = await Promise.all([
            Feedback.find(dateFilter)
                .sort({ createdAt: -1 })
                .select('ticketId feedbackOriginalText sentimentLabel sentimentLevel emotionDetected categoryUserSelected priority status rating userName userEmail userId hasEmoji sentimentConflict isCritical suggestedResponse createdAt resolvedAt')
                .lean(),
            SummaryCache.findOne({ period: cachePeriod, expiresAt: { $gt: new Date() } }).lean(),
        ]);

        const html = buildPDFHTML(feedbacks, null, cachedSummary, req.query);

        res.set({
            'Content-Type': 'text/html; charset=utf-8',
        });
        res.send(html);
    } catch (err) {
        console.error('[Export] PDF error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to generate PDF. Please try again.' });
    }
});

// ─── GET /api/export/csv ─────────────────────────────────────────────────────
router.get('/csv', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const dateFilter = getDateFilter(req.query);

        const feedbacks = await Feedback.find(dateFilter)
            .sort({ createdAt: -1 })
            .select('ticketId feedbackOriginalText sentimentLabel sentimentLevel emotionDetected categoryUserSelected priority status rating userName userEmail userId hasEmoji sentimentConflict createdAt resolvedAt')
            .lean();

        const csv = buildCSV(feedbacks);
        const today = new Date().toISOString().split('T')[0];

        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="FeedScope-Data-${today}.csv"`,
        });
        res.end(csv);
    } catch (err) {
        console.error('[Export] CSV error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to export CSV.' });
    }
});

export default router;
