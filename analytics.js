/**
 * StudyOS Analytics — Umami Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Umami handles: storage · sessions · batching · visitors · referrers
 * We handle:     SPA page tracking · feature events · errors · time-on-page
 *
 * Setup: see ANALYTICS_SETUP.md
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Analytics = (() => {

    let _currentPage = null;
    let _pageStart   = null;
    let _initialized = false;

    // ── Safely grab the Umami instance (may load slightly after this script) ──
    function _u() { return window.umami || null; }

    // ── Track a page view (called on every App.navigate) ─────────────────────
    function trackPage(page) {
        if (_currentPage && _pageStart) {
            const seconds = Math.round((Date.now() - _pageStart) / 1000);
            _u()?.track('page_time', { page: _currentPage, seconds });
        }

        _currentPage = page;
        _pageStart   = Date.now();

        // Use string format instead of object
        _u()?.track('page-' + page);
    }
    // ── Track a feature interaction ───────────────────────────────────────────
    function trackFeature(name, props = {}) {
        const hasProps = Object.keys(props).length > 0;
        _u()?.track(name, hasProps ? props : undefined);
    }

    // ── Track a JS error ──────────────────────────────────────────────────────
    function trackError(message, source = '') {
        _u()?.track('js_error', {
            message: String(message).slice(0, 200),
            source:  String(source).slice(0, 150),
        });
    }

    // ── Wrap an App method to fire a tracking event on call ───────────────────
    function _wrap(methodName, eventName, propsFactory) {
        if (typeof window.App?.[methodName] !== 'function') return;
        const original = window.App[methodName].bind(window.App);
        window.App[methodName] = function (...args) {
            try { trackFeature(eventName, propsFactory?.(...args) ?? {}); } catch {}
            return original(...args);
        };
    }

    // ── Main init ─────────────────────────────────────────────────────────────
    function init() {
        if (_initialized) return;

        // App may still be initialising — retry until navigate exists
        if (!window.App?.navigate) { setTimeout(init, 150); return; }
        _initialized = true;

        // ── 1. SPA page tracking ──────────────────────────────────────────────
        const _origNav = window.App.navigate.bind(window.App);
        window.App.navigate = function (page, ...rest) {
            trackPage(page);
            return _origNav(page, ...rest);
        };

        // ── 2. Feature tracking ───────────────────────────────────────────────

        // Study sessions
        _wrap('openQuickLog',     'quick_log_opened');
        _wrap('saveStudyLog',     'study_session_logged');

        // Content
        _wrap('saveSubject',      'subject_added');
        _wrap('saveChapter',      'chapter_added');
        _wrap('markComplete',     'chapter_completed');
        _wrap('markRevised',      'chapter_revised');
        _wrap('saveExamScore',    'exam_score_logged');
        _wrap('saveDoubt',        'doubt_added');
        _wrap('saveNote',         'note_saved');
        _wrap('saveNoteFromModal','note_saved');
        _wrap('saveResource',     'resource_added');
        _wrap('saveEodCheckin',   'eod_checkin_saved');
        _wrap('saveTask',         'task_saved');

        // AI Coach
        _wrap('sendCoachMessage', 'ai_coach_used');

        // Quiz
        _wrap('generateQuiz',    'quiz_generated');
        _wrap('startQuiz',       'quiz_started');

        // Focus tools
        _wrap('startPomodoro',   'pomodoro_started');
        _wrap('startStopwatch',  'stopwatch_started');
        _wrap('stopStopwatch',   'stopwatch_stopped');

        // Misc
        _wrap('setMood',         'mood_set');
        _wrap('toggleTheme',     'theme_changed');

        // ── 3. Error tracking ─────────────────────────────────────────────────
        window.addEventListener('error', (e) => {
            trackError(e.message, `${e.filename}:${e.lineno}`);
        });
        window.addEventListener('unhandledrejection', (e) => {
            trackError('UnhandledRejection', String(e.reason).slice(0, 150));
        });

        // ── 4. Flush page-time when the tab hides (mobile-safe) ───────────────
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && _currentPage && _pageStart) {
                const seconds = Math.round((Date.now() - _pageStart) / 1000);
                _u()?.track('page_time', { page: _currentPage, seconds });
                _pageStart = Date.now(); // reset so re-focus doesn't double-count
            }
        });

        // ── 5. Track the initial page ─────────────────────────────────────────
        trackPage(window.App?.state?.currentPage || 'dashboard');
    }

    // Kick off after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }

    return { init, trackPage, trackFeature, trackError };

})();
