/**
 * StudyOS Analytics — Umami Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Fix: App is declared with const/let so window.App is always null.
 *      Use a _app() helper that accesses App directly instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Analytics = (() => {

    let _currentPage = null;
    let _pageStart   = null;
    let _initialized = false;

    // ── Safe accessor for App (not on window — declared with const/let) ───────
    function _app() {
        try { return typeof App !== 'undefined' ? App : null; } catch { return null; }
    }

    // ── Safe accessor for Umami ───────────────────────────────────────────────
    function _u() { return window.umami || null; }

    // ── Track a page view ─────────────────────────────────────────────────────
    function trackPage(page) {
        if (_currentPage && _pageStart) {
            const seconds = Math.round((Date.now() - _pageStart) / 1000);
            _u()?.track('page_time', { page: _currentPage, seconds });
        }
        _currentPage = page;
        _pageStart   = Date.now();
        _u()?.track('page:' + page);
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
    function _wrap(methodName, eventName) {
        const app = _app();
        if (!app || typeof app[methodName] !== 'function') return;
        const original = app[methodName].bind(app);
        app[methodName] = function (...args) {
            try { trackFeature(eventName); } catch {}
            return original(...args);
        };
    }

    // ── Main init ─────────────────────────────────────────────────────────────
    function init() {
        if (_initialized) return;
        const app = _app();
        if (!app?.navigate) { setTimeout(init, 150); return; }
        _initialized = true;

        // ── 1. SPA page tracking ──────────────────────────────────────────────
        const _origNav = app.navigate.bind(app);
        app.navigate = function (page, ...rest) {
            trackPage(page);
            return _origNav(page, ...rest);
        };

        // ── 2. Feature tracking (verified against real App methods) ───────────

        // Study sessions
        _wrap('openQuickLog',      'quick_log_opened');
        _wrap('saveStudyLog',      'study_session_logged');

        // Content — confirmed method names from App object
        _wrap('saveSubject',       'subject_added');
        _wrap('saveChapter',       'chapter_added');
        _wrap('toggleChapter',     'chapter_toggled');      // marks complete/in-progress
        _wrap('quickRevision',     'chapter_revised');      // was wrongly 'markRevised'
        _wrap('saveExamScore',     'exam_score_logged');
        _wrap('saveDoubt',         'doubt_added');
        _wrap('saveNoteFromModal', 'note_saved');
        _wrap('saveResource',      'resource_added');
        _wrap('saveEodCheckin',    'eod_checkin_saved');
        _wrap('addTask',           'task_added');           // was wrongly 'saveTask'
        _wrap('toggleTask',        'task_toggled');

        // AI Coach
        _wrap('sendCoachMessage',  'ai_coach_used');

        // Quiz — 'generateQuiz' doesn't exist; startQuiz is the real entry point
        _wrap('startQuiz',         'quiz_started');

        // Focus tools
        _wrap('startPomodoro',     'pomodoro_started');
        _wrap('pausePomodoro',     'pomodoro_paused');
        _wrap('resetPomodoro',     'pomodoro_reset');
        _wrap('startStopwatch',    'stopwatch_started');
        _wrap('stopStopwatch',     'stopwatch_stopped');

        // Misc
        _wrap('setMood',           'mood_set');
        _wrap('toggleTheme',       'theme_changed');
        _wrap('exportData',        'data_exported');

        // ── 3. Error tracking ─────────────────────────────────────────────────
        window.addEventListener('error', (e) => {
            trackError(e.message, `${e.filename}:${e.lineno}`);
        });
        window.addEventListener('unhandledrejection', (e) => {
            trackError('UnhandledRejection', String(e.reason).slice(0, 150));
        });

        // ── 4. Page-time on tab hide ──────────────────────────────────────────
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && _currentPage && _pageStart) {
                const seconds = Math.round((Date.now() - _pageStart) / 1000);
                _u()?.track('page_time', { page: _currentPage, seconds });
                _pageStart = Date.now();
            }
        });

        // ── 5. Track initial page ─────────────────────────────────────────────
        trackPage(_app()?.state?.currentPage || 'dashboard');

        console.log('[Analytics] Initialized ✓');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }

    return { init, trackPage, trackFeature, trackError };

})();