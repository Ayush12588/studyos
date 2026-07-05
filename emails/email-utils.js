/**
 * emails/email-utils.js
 * Reusable logic for processing data for emails.
 */

export const TYPE_LABELS = {
    lecture_pending: 'Lecture',
    revision_pending: 'Revision',
    questions_pending: 'Questions',
    chapter_unstarted: 'Not Started',
};

// 1. Morning: Focus on planning and clarity
const MORNING_SUBJECTS = [
    "Your daily study overview",
    "Target: {marks} board marks on the agenda today",
    "Here are your priority topics for today",
    "Your BoardOS daily focus list"
];

// 2. Evening: Focus on small actions and breaking friction
const EVENING_SUBJECTS = [
    "Just one topic to move forward",
    "A small step tonight makes tomorrow easier",
    "Clear one topic off your desk tonight",
    "Evening check-in: protect your momentum"
];

// 3. Night: Focus on administration and tracking
const NIGHT_SUBJECTS = [
    "Did you study today? Don't forget to log it",
    "Quick reminder: keep your dashboard accurate",
    "Before bed: update your study progress",
    "Log your session to keep your stats updated"
];

export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function generateSubject({ marksAtRisk, slot }) {
    let list = MORNING_SUBJECTS;
    if (slot === 'evening') list = EVENING_SUBJECTS;
    if (slot === 'night') list = NIGHT_SUBJECTS;
    
    // Rotate subjects based on the day of the month to prevent banner blindness
    const dayOfMonth = new Date().getDate();
    const index = dayOfMonth % list.length;
    
    return list[index].replace('{marks}', marksAtRisk);
}

export function formatTypeLines(byType) {
    const parts = [];
    if (byType.lecture_pending) parts.push(`${byType.lecture_pending} Lectures`);
    if (byType.revision_pending) parts.push(`${byType.revision_pending} Revisions`);
    if (byType.questions_pending) parts.push(`${byType.questions_pending} Question Sets`);
    if (byType.chapter_unstarted) parts.push(`${byType.chapter_unstarted} Unstarted Chapters`);
    
    return parts.join(' • ') || 'Various pending items';
}