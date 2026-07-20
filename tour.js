/**
 * BoardOS Onboarding — v3
 *
 * Three independent stages, all sharing one tooltip engine:
 *
 *   STAGE 1 — Micro-tour (3 steps)
 *     Fires once, ~3s after completeWelcome(). Orients the user to
 *     sidebar / Quick Log / dashboard. Does NOT walk the nav tree —
 *     that's what Stage 2 is for. Flag: bos_tour_micro_done
 *
 *   STAGE 2 — Contextual first-visit tips (1 step per page)
 *     Fires the first time a user navigates to a given page, AFTER
 *     that page has rendered. One page = one flag, so a user who
 *     visits Subjects, Circles, Backlog etc. across many sessions
 *     still only ever sees each tip once. Hook: App.navigate().
 *     Flag: bos_tip_seen_<page>
 *
 *   STAGE 3 — Install prompt
 *     Fires once, after the user's 2nd successful Quick Log — a much
 *     higher-intent moment than "just finished welcome screen."
 *     Hook: App.saveStudyLog(). Flag: bos_install_prompt_done
 *
 * HOW to activate (in app.js):
 *   1. At the end of completeWelcome():
 *        setTimeout(() => window.BoardOSTour && window.BoardOSTour.startMicroTour(), 3000);
 *   2. At the end of navigate(), inside the _loadTabData(...).then() callback,
 *      after this.renderPage(page):
 *        window.BoardOSTour && window.BoardOSTour.maybeShowPageTip(page);
 *   3. At the end of saveStudyLog(), after this.render():
 *        window.BoardOSTour && window.BoardOSTour.notifySessionLogged();
 *
 * Replay (Settings page): window.BoardOSTour.replayMicroTour()
 *   — resets and replays ONLY the Stage 1 micro-tour. Stage 2 tips are
 *   inherently first-visit-only and are not meant to be replayed; if a
 *   user wants a refresher on a specific page, that's the empty-state's
 *   job, not the tour's.
 */

(function () {
  'use strict';

  const KEY_MICRO   = 'bos_tour_micro_done';
  const KEY_INSTALL = 'bos_install_prompt_done';
  const KEY_LOG_COUNT = 'bos_quicklog_count';
  const tipKey = (page) => `bos_tip_seen_${page}`;

  const isMobile = () => window.innerWidth < 768;

  // ─── STAGE 1: Micro-tour steps ────────────────────────────────────────────
  // Action-tour, not a literacy-tour: every step points at ONE real dashboard
  // widget and names the specific motion you make with it. No "here's the
  // sidebar" step — the dashboard itself has enough nameable, stable anchors
  // (.db-hero, .topbar-quicklog, .db-stats, streak card) to teach by pointing
  // at real UI instead of talking about it abstractly.
  //
  // NOTE on the "+ Chapter" topbar button: it isn't wired in app.js (it must
  // live in app.html's topbar markup, which wasn't available when this was
  // written). I've targeted a best-guess selector with a documented fallback
  // — see step 4 below. Verify the real id/class and swap it in before ship.

  const MICRO_STEPS = [
    {
      target: '.topbar-quicklog',
      position: 'bottom',
      title: 'Start here: Quick Log',
      body: 'Finished studying? Tap this to log the session — subject, chapter, time. This is what builds your streak.',
    },
    {
      target: '.db-hero',
      position: 'bottom',
      title: 'Your next move, decided for you',
      body: 'This card always shows what to study next. Tap <strong>Log Session</strong> when you finish it, or <strong>Skip →</strong> if you\'d rather do something else.',
    },
    {
      // Revisions Due panel has no stable class — it's a conditionally-rendered
      // inline-styled div (see renderDashboard(), SECTION 2), and its border
      // color (#F97316) is NOT unique — the active-streak card uses the same
      // color, so a style-attribute selector would ambiguously match either.
      // Targeting structurally instead: it's the sibling immediately after
      // .db-hero, and ONLY renders when rd.length > 0 (see revisionsDueHTML
      // in renderDashboard()). Falls back to .db-stats when nothing's due,
      // so the tour never points at empty space either way.
      target: '.db-hero ~ div:has(button[onclick*="revisions"])',
      fallback: '.db-stats',
      position: 'top',
      title: 'Revisions pile up if ignored',
      body: 'Chapters you studied before resurface here on a schedule. Tap any one to clear it — that\'s what "overdue" means.',
    },
    // NOTE: a 4th step targeting a topbar "+ Chapter" button was removed —
    // verified against app.html that no such topbar button exists. Adding a
    // new chapter only happens per-subject, inside the Subjects page (the
    // "+" button on each subject card). That page already gets its own
    // Stage-2 tip explaining chapters, so nothing lost coverage.
    {
      target: '.db-stats',
      position: 'top',
      title: 'Your streak lives here',
      body: 'One logged session a day keeps it alive. Miss a day and it resets — unless you\'ve earned a freeze.',
    },
  ];

  // ─── STAGE 2: Contextual first-visit tips ─────────────────────────────────
  // One line each. Only written where the empty-state copy doesn't already
  // carry the explanation on its own (Backlog is the clearest case — "study
  // debt" is a term unique to this app). Pages with self-explanatory empty
  // states still get an entry per "full coverage," but kept minimal so they
  // don't turn into a second tour.

  const PAGE_TIPS = {
    subjects: {
      target: '[data-page="subjects"].nav-item, .subject-card',
      fallback: '#content',
      position: 'bottom',
      title: 'Subjects & Chapters',
      body: 'Tap any chapter to mark it done, log a revision, or add notes.',
    },
    tasks: {
      target: '[data-page="tasks"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'Daily Tasks',
      body: 'Small, specific to-dos for today — separate from your full syllabus.',
    },
    backlog: {
      target: '[data-page="backlog"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'What is Backlog?',
      body: 'Chapters that are falling behind schedule land here — think of it as study debt you can pay down.',
    },
    revisions: {
      target: '[data-page="revisions"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'Revisions',
      body: 'Spaced-repetition reminders for chapters you\'ve already studied, timed so they don\'t fade.',
    },
    quiz: {
      target: '[data-page="quiz"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'Quiz',
      body: 'Quick active-recall questions from your own chapters — a faster check than re-reading notes.',
    },
    coach: {
      target: '[data-page="coach"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'AI Coach',
      body: 'Stuck on a concept? Ask here for an instant, CBSE-specific explanation.',
    },
    circles: {
      target: null,
      position: 'center',
      title: 'Study Circles',
      body: 'Form a small group, track chapters and streaks together — nobody studies better alone.',
    },
    weekly: {
      target: '[data-page="weekly"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'Analytics',
      body: 'Your weekly and monthly trends — time studied, pacing, and where you\'re falling behind.',
    },
    exams: {
      target: '[data-page="exams"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'Exam Scores',
      body: 'Log past test scores here to track improvement subject by subject.',
    },
    rewards: {
      target: '[data-page="rewards"].nav-item',
      fallback: '#content',
      position: 'bottom',
      title: 'Rewards & XP',
      body: 'Every session earns XP. Level up and unlock badges as you stay consistent.',
    },
    notes: {
      target: null,
      position: 'center',
      title: 'Notes',
      body: 'A place for quick notes and formulas, organized by subject.',
    },
    resources: {
      target: null,
      position: 'center',
      title: 'Resources',
      body: 'Save useful links — reference material, videos, anything worth revisiting.',
    },
    settings: {
      target: null,
      position: 'center',
      title: 'Settings',
      body: 'Update your exam date, daily goal, and preferences here any time.',
    },
  };
  // Note: 'dashboard' has no Stage-2 tip — it's covered by the Stage-1 micro-tour.
  // 'log' (Study Log) has no Stage-2 tip — its own empty state already explains it,
  // and it's reached almost exclusively via Quick Log, not cold navigation.

  // ─── Shared state ─────────────────────────────────────────────────────────
  let tooltipEl = null;
  let arrowEl = null;
  let highlightedEl = null;
  let activeQueue = [];   // steps currently being shown (micro-tour only; page tips are single-step)
  let activeIndex = 0;
  let onQueueDone = null;

  // ─── Styles (unchanged engine, renamed ids to avoid collision w/ any cached old CSS) ──
  function injectStyles() {
    if (document.getElementById('bos-tour-styles')) return;
    const s = document.createElement('style');
    s.id = 'bos-tour-styles';
    s.textContent = `
      #bos-tooltip {
        position: fixed;
        z-index: 99999;
        width: 300px;
        max-width: calc(100vw - 24px);
        background: var(--color-surface, #1c1c2e);
        border: 1px solid rgba(245,158,11,0.25);
        border-radius: 14px;
        padding: 16px 16px 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        font-family: var(--font-body, 'Inter', sans-serif);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: all;
      }
      #bos-tooltip.bos-show { opacity: 1; transform: translateY(0); }
      #bos-tooltip.bos-center {
        left: 50% !important; top: 50% !important;
        transform: translate(-50%, -46%) !important;
      }
      #bos-tooltip.bos-center.bos-show { transform: translate(-50%, -50%) !important; }
      #bos-arrow {
        position: fixed; z-index: 99998;
        width: 10px; height: 10px;
        background: var(--color-surface, #1c1c2e);
        border: 1px solid rgba(245,158,11,0.25);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      #bos-arrow.bos-show { opacity: 1; }
      .bos-eyebrow {
        font-size: 0.65rem; font-weight: 700; letter-spacing: 0.09em;
        text-transform: uppercase; color: var(--color-warning, #f59e0b);
        margin-bottom: 5px;
      }
      .bos-title {
        font-size: 0.9rem; font-weight: 700;
        color: var(--color-text, #f1f5f9);
        margin: 0 0 6px; line-height: 1.3;
      }
      .bos-body {
        font-size: 0.79rem;
        color: var(--color-text-secondary, #94a3b8);
        line-height: 1.55;
        margin: 0 0 12px;
      }
      .bos-body strong { color: var(--color-text, #f1f5f9); }
      .bos-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .bos-dots { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
      .bos-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: all 0.2s; flex-shrink: 0; }
      .bos-dot.on { background: var(--color-warning, #f59e0b); width: 16px; border-radius: 3px; }
      .bos-btns { display: flex; gap: 6px; }
      .bos-btn {
        font-family: var(--font-body, 'Inter', sans-serif);
        font-size: 0.75rem; font-weight: 600;
        padding: 6px 12px; border-radius: 8px; border: none;
        cursor: pointer; line-height: 1;
        transition: opacity 0.15s, transform 0.1s;
      }
      .bos-btn:active { transform: scale(0.95); }
      .bos-skip { background: transparent; color: var(--color-text-secondary, #64748b); padding: 6px 2px; }
      .bos-skip:hover { color: var(--color-text, #f1f5f9); }
      .bos-next { background: var(--color-warning, #f59e0b); color: #000; }
      .bos-next:hover { opacity: 0.88; }
      .bos-back {
        background: transparent; color: var(--color-text-secondary, #64748b);
        border: 1px solid rgba(255,255,255,0.1); padding: 6px 10px;
      }
      .bos-back:hover { color: var(--color-text, #f1f5f9); border-color: rgba(255,255,255,0.2); }
      .bos-ring {
        outline: 2px solid var(--color-warning, #f59e0b) !important;
        outline-offset: 4px !important;
        border-radius: 8px; position: relative; z-index: 9999;
      }
      /* Stage 3 install card gets a slightly wider tooltip */
      #bos-tooltip.bos-install { width: 320px; }
    `;
    document.head.appendChild(s);
  }

  function buildDOM() {
    if (tooltipEl) return; // already built
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'bos-tooltip';
    tooltipEl.setAttribute('role', 'dialog');

    arrowEl = document.createElement('div');
    arrowEl.id = 'bos-arrow';

    document.body.appendChild(arrowEl);
    document.body.appendChild(tooltipEl);
  }

  function teardownDOM() {
    tooltipEl && tooltipEl.remove();
    arrowEl && arrowEl.remove();
    tooltipEl = null;
    arrowEl = null;
    if (highlightedEl) {
      highlightedEl.classList.remove('bos-ring');
      highlightedEl = null;
    }
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(val, max)); }

  function setArrow(left, top, borderCss) {
    arrowEl.style.cssText = `
      position:fixed; z-index:99998; width:10px; height:10px;
      background:var(--color-surface,#1c1c2e);
      border:1px solid rgba(245,158,11,0.25);
      pointer-events:none; left:${left}px; top:${top}px; ${borderCss};
    `;
  }

  function position(step) {
    tooltipEl.classList.remove('bos-center');
    arrowEl.style.display = 'block';

    let target = step.target ? document.querySelector(step.target) : null;
    if (!target && step.fallback) target = document.querySelector(step.fallback);

    if (!target || step.position === 'center') {
      tooltipEl.classList.add('bos-center');
      tooltipEl.style.left = '';
      tooltipEl.style.top = '';
      arrowEl.style.display = 'none';
      return null;
    }

    const GAP = 12;
    const rect = target.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth || 300;
    const th = tooltipEl.offsetHeight || 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;
    let pos = step.position;
    if (isMobile() && (pos === 'right' || pos === 'left')) pos = 'bottom';

    switch (pos) {
      case 'right':
        top  = clamp(rect.top + rect.height / 2 - th / 2, 12, vh - th - 12);
        left = clamp(rect.right + GAP, 12, vw - tw - 12);
        setArrow(rect.right + GAP - 6, rect.top + rect.height / 2 - 5, 'border-top:none;border-right:none;transform:rotate(45deg)');
        break;
      case 'left':
        top  = clamp(rect.top + rect.height / 2 - th / 2, 12, vh - th - 12);
        left = clamp(rect.left - tw - GAP, 12, vw - tw - 12);
        setArrow(rect.left - GAP + 1, rect.top + rect.height / 2 - 5, 'border-bottom:none;border-left:none;transform:rotate(45deg)');
        break;
      case 'top':
        top  = clamp(rect.top - th - GAP, 12, vh - th - 12);
        left = clamp(rect.left + rect.width / 2 - tw / 2, 12, vw - tw - 12);
        setArrow(rect.left + rect.width / 2 - 5, rect.top - GAP + 1, 'border-top:none;border-left:none;transform:rotate(45deg)');
        break;
      case 'bottom':
      default:
        top  = clamp(rect.bottom + GAP, 12, vh - th - 12);
        left = clamp(rect.left + rect.width / 2 - tw / 2, 12, vw - tw - 12);
        setArrow(rect.left + rect.width / 2 - 5, rect.bottom + GAP - 6, 'border-bottom:none;border-right:none;transform:rotate(45deg)');
        break;
    }

    tooltipEl.style.top  = top  + 'px';
    tooltipEl.style.left = left + 'px';
    return target;
  }

  // ─── Render a single-step popup (used by Stage 2 + Stage 3) ───────────────
  function renderSingle(step, onDismiss) {
    tooltipEl.innerHTML = `
      <div class="bos-title">${step.title}</div>
      <div class="bos-body">${step.body}</div>
      <div class="bos-footer" style="justify-content:flex-end">
        <div class="bos-btns">
          <button class="bos-btn bos-next" id="bos-ok-btn">${step.okLabel || 'Got it'}</button>
        </div>
      </div>
    `;
    document.getElementById('bos-ok-btn').onclick = () => {
      hide(onDismiss);
    };
  }

  // ─── Render a queue-step popup (used by Stage 1 micro-tour) ───────────────
  function renderQueued(index) {
    const step = activeQueue[index];
    const total = activeQueue.length;
    const isLast = index === total - 1;

    const dots = activeQueue.map((_, i) =>
      `<span class="bos-dot ${i === index ? 'on' : ''}"></span>`
    ).join('');

    tooltipEl.innerHTML = `
      <div class="bos-eyebrow">Step ${index + 1} of ${total}</div>
      <div class="bos-title">${step.title}</div>
      <div class="bos-body">${step.body}</div>
      <div class="bos-footer">
        <div class="bos-dots">${dots}</div>
        <div class="bos-btns">
          <button class="bos-btn bos-skip" id="bos-skip-btn">Skip</button>
          ${index > 0 ? '<button class="bos-btn bos-back" id="bos-back-btn">← Back</button>' : ''}
          <button class="bos-btn bos-next" id="bos-next-btn">${isLast ? 'Done 🎉' : 'Next →'}</button>
        </div>
      </div>
    `;

    document.getElementById('bos-next-btn').onclick = () => advanceQueue();
    document.getElementById('bos-skip-btn').onclick = () => hide(onQueueDone);
    if (index > 0) document.getElementById('bos-back-btn').onclick = () => backQueue();
  }

  function showQueuedStep(index) {
    if (highlightedEl) { highlightedEl.classList.remove('bos-ring'); highlightedEl = null; }
    tooltipEl.classList.remove('bos-show');
    arrowEl.classList.remove('bos-show');

    const step = activeQueue[index];
    if (step.beforeShow) { try { step.beforeShow(); } catch (e) {} }

    renderQueued(index);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = position(step);
        if (target) {
          highlightedEl = target;
          target.classList.add('bos-ring');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        tooltipEl.classList.add('bos-show');
        arrowEl.classList.add('bos-show');
      });
    });
  }

  function advanceQueue() {
    activeIndex++;
    if (activeIndex >= activeQueue.length) { hide(onQueueDone); }
    else { showQueuedStep(activeIndex); }
  }

  function backQueue() {
    if (activeIndex > 0) { activeIndex--; showQueuedStep(activeIndex); }
  }

  function hide(cb) {
    if (!tooltipEl) { cb && cb(); return; }
    tooltipEl.classList.remove('bos-show');
    arrowEl.classList.remove('bos-show');
    setTimeout(() => {
      teardownDOM();
      cb && cb();
    }, 220);
  }

  // ─── Show a single popup step (Stage 2 / Stage 3), anchored or centered ───
  function showSingleStep(step, onDismiss) {
    injectStyles();
    buildDOM();
    renderSingle(step, onDismiss);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = position(step);
        if (target) {
          highlightedEl = target;
          target.classList.add('bos-ring');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        tooltipEl.classList.add('bos-show');
        arrowEl.classList.add('bos-show');
      });
    });
  }

  // ─── STAGE 1 public entry ──────────────────────────────────────────────────
  function startMicroTour() {
    if (localStorage.getItem(KEY_MICRO)) return;

    injectStyles();
    buildDOM();
    activeQueue = MICRO_STEPS;
    activeIndex = 0;
    onQueueDone = () => localStorage.setItem(KEY_MICRO, '1');
    showQueuedStep(0);
  }

  function replayMicroTour() {
    localStorage.removeItem(KEY_MICRO);
    startMicroTour();
  }

  // ─── STAGE 2 public entry ──────────────────────────────────────────────────
  // Call after a page has rendered (i.e. inside navigate()'s render callback).
  // Silently no-ops if: no tip defined for this page, already seen, or the
  // micro-tour hasn't finished yet (avoid stacking two tour UIs).
  function maybeShowPageTip(page) {
    if (!localStorage.getItem(KEY_MICRO)) return; // let Stage 1 finish first
    const step = PAGE_TIPS[page];
    if (!step) return;
    if (localStorage.getItem(tipKey(page))) return;
    if (tooltipEl) return; // something already showing (e.g. micro-tour mid-flight)

    // Small delay so it doesn't fight the page's own render/paint.
    setTimeout(() => {
      if (tooltipEl) return; // re-check race
      showSingleStep(step, () => localStorage.setItem(tipKey(page), '1'));
    }, 500);
  }

  // ─── STAGE 3 public entry ──────────────────────────────────────────────────
  // Call after every successful Quick Log save. Fires the install prompt
  // exactly once, right after the 2nd logged session.
  function notifySessionLogged() {
    if (localStorage.getItem(KEY_INSTALL)) return;

    const count = (parseInt(localStorage.getItem(KEY_LOG_COUNT) || '0', 10)) + 1;
    localStorage.setItem(KEY_LOG_COUNT, String(count));
    if (count < 2) return;
    if (tooltipEl) return; // don't interrupt an active tip

    localStorage.setItem(KEY_INSTALL, '1');

    const installBody = isMobile()
      ? '<strong>Android (Chrome):</strong> Tap ⋮ → "Add to Home Screen".<br><br><strong>iPhone (Safari):</strong> Tap Share → "Add to Home Screen".<br><br>Opens instantly, works offline.'
      : '<strong>Chrome / Edge:</strong> Click the install icon ⊕ in the address bar → "Install".<br><br>Opens like a native app, works offline.';

    setTimeout(() => {
      injectStyles();
      buildDOM();
      tooltipEl.classList.add('bos-install');
      showSingleStep({
        target: null,
        position: 'center',
        title: '📲 Install BoardOS',
        body: `You're 2 sessions in — install it so it's one tap away next time.<br><br>${installBody}`,
        okLabel: 'Got it',
      }, null);
    }, 800);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────
  window.BoardOSTour = {
    startMicroTour,
    replayMicroTour,
    maybeShowPageTip,
    notifySessionLogged,
    // dev/testing helpers
    resetAll: () => {
      Object.keys(localStorage)
        .filter(k => k.startsWith('bos_tour_') || k.startsWith('bos_tip_seen_') || k.startsWith('bos_install_') || k.startsWith('bos_quicklog_'))
        .forEach(k => localStorage.removeItem(k));
    },
  };

  // Back-compat alias in case anything still references the old global name
  window.StudyOSTour = {
    start: startMicroTour,
    reset: () => localStorage.removeItem(KEY_MICRO),
    replay: replayMicroTour,
  };

})();