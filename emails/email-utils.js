/**
 * emails/email-utils.js
 * Reusable logic for processing data for emails.
 *
 * REWRITE NOTE (2026-07-10): Subject generation now keys off pendingCount /
 * urgentCount (chapter counts) instead of marksAtRisk, since the reminder
 * pipeline now reads from `chapters` rather than `backlog_items`, which has
 * no marks/priority data. TYPE_LABELS and formatTypeLines removed — they
 * were for backlog_items.type values (lecture_pending, revision_pending,
 * etc.) which don't exist on chapters.
 */

// 1. Morning: Focus on planning and clarity
const MORNING_SUBJECTS = [
    "Your daily study overview",
    "{pending} topics on the agenda today",
    "Here are your priority chapters for today",
    "Your BoardOS daily focus list"
];

// 2. Evening: Focus on small actions and breaking friction
const EVENING_SUBJECTS = [
    "Just one chapter to move forward",
    "A small step tonight makes tomorrow easier",
    "Clear one chapter off your desk tonight",
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

export function generateSubject({ pendingCount, urgentCount, slot }) {
    // Urgent (deadline within 2 days) overrides the rotating copy entirely —
    // this is the one case where specificity beats variety.
    if (urgentCount > 0) {
        return urgentCount === 1
            ? '1 chapter deadline is close — take a look'
            : `${urgentCount} chapter deadlines are close — take a look`;
    }

    let list = MORNING_SUBJECTS;
    if (slot === 'evening') list = EVENING_SUBJECTS;
    if (slot === 'night') list = NIGHT_SUBJECTS;

    // Rotate subjects based on the day of the month to prevent banner blindness
    const dayOfMonth = new Date().getDate();
    const index = dayOfMonth % list.length;

    return list[index].replace('{pending}', pendingCount);
}