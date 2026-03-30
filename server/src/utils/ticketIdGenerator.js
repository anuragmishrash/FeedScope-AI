/**
 * Ticket ID Generator
 * Generates unique IDs in format: FSC-YYYYMMDD-XXXX
 * Uses unambiguous character set (no 0/O, no 1/I/L)
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTicketId() {
    const d = new Date();
    const dateStr =
        d.getFullYear().toString() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0');
    const random = Array.from({ length: 4 }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
    return `FSC-${dateStr}-${random}`;
}

/**
 * Generate a unique ticket ID with collision retry.
 * @param {mongoose.Model} FeedbackModel - Feedback model for uniqueness check
 * @param {number} maxRetries
 * @returns {Promise<string>}
 */
export async function generateUniqueTicketId(FeedbackModel, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const id = generateTicketId();
        const existing = await FeedbackModel.findOne({ ticketId: id }).lean();
        if (!existing) return id;
    }
    // Absolute fallback: append timestamp ms for guaranteed uniqueness
    return `FSC-${Date.now()}-XXXX`;
}

export { generateTicketId };
