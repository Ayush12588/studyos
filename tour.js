/**
 * StudyOS Onboarding Tour v2
 *
 * WHEN it fires:
 *   - Only for brand-new users, right after they complete the welcome setup
 *   - Hook: App.completeWelcome() calls window.StudyOSTour.start() at the end
 *   - Never fires for returning users (localStorage flag: studyos_tour_v2_done)
 *
 * HOW to activate:
 *   In app.js, at the end of completeWelcome(), add:
 *     setTimeout(() => window.StudyOSTour && window.StudyOSTour.start(), 3000);
 */

(function () {
  'use strict';

  const TOUR_KEY = 'studyos_tour_v2_done';
  const isMobile = () => window.innerWidth < 768;

  // ─── Tour Steps ───────────────────────────────────────────────────────────
  // Mobile-first: first step on mobile tells user to open sidebar
  // position: top | bottom | left | right | center

  const STEPS_DESKTOP = [
    {
      target: '#sidebar',
      position: 'right',
      title: 'Your Navigation Hub',
      body: 'Everything you need lives here — Subjects, Study Log, AI Coach, Focus Timer, and more. Let\'s walk through the key ones.',
    },
    {
      target: '[data-page="dashboard"].nav-item',
      position: 'right',
      title: 'Dashboard',
      body: 'Your daily command center. See your streak, study time, chapters done, and what to study next — all at a glance.',
    },
    {
      target: '[data-page="subjects"].nav-item',
      position: 'right',
      title: 'Subjects & Chapters',
      body: 'All your CBSE chapters, organized by subject. Tap a chapter to mark it done, log a revision, or add notes.',
    },
    {
      target: '[data-page="log"].nav-item',
      position: 'right',
      title: 'Study Log',
      body: 'Every session you log shows up here. It\'s your personal study history — useful for reviewing how consistent you\'ve been.',
    },
    {
      target: '[data-page="coach"].nav-item',
      position: 'right',
      title: 'AI Study Coach',
      body: 'Stuck on a concept? Your AI Coach gives instant, personalized explanations for any CBSE topic — available 24/7.',
    },
    {
      target: '[data-page="pomodoro"].nav-item',
      position: 'right',
      title: 'Focus Timer',
      body: 'A Pomodoro-style timer to help you study in focused bursts with short breaks. Great for deep work sessions.',
    },
    {
      target: '#nav-group-track-header',
      position: 'right',
      title: 'Track Section',
      body: 'Expand this to access Daily Tasks, Revision Tracker, Exam Scores, Doubt Tracker, and your Study Plan. These keep your preparation sharp.',
    },
    {
      target: '#nav-group-more > div:first-child, [data-page="weekly"].nav-item',
      position: 'right',
      title: 'More Section — Analytics, Rewards & Settings',
      body: 'Click "More" in the sidebar to find Analytics (your weekly/monthly stats), Notes, Resources, Rewards (XP & badges), and Settings.',
      beforeShow: () => {
        // Auto-expand the More group so items are visible
        const group = document.getElementById('nav-group-more');
        if (group && !group.classList.contains('open')) {
          App && App.toggleNavGroup && App.toggleNavGroup('more');
        }
      },
    },
    {
      target: '[data-page="rewards"].nav-item',
      position: 'right',
      title: 'Rewards & XP',
      body: 'Earn XP for every session you log. Level up, unlock badges, and track your progress. StudyOS makes consistency rewarding.',
    },
    {
      target: '.topbar-quicklog',
      position: 'bottom',
      title: 'Quick Log — Your Most-Used Button',
      body: 'Just finished a study session? Hit Quick Log to record it in seconds. This is how your streak stays alive and your progress gets tracked.',
    },
    {
      target: '#topbar-exam-pill',
      position: 'bottom',
      fallback: '.topbar-actions',
      title: 'Exam Countdown',
      body: 'Shows exactly how many days you have until your board exams. Every day that ticks down is one less day to prepare — use them well.',
    },
    {
      target: null,
      position: 'center',
      title: '📲 Install StudyOS on Your Device',
      body: `<strong>On Chrome / Edge (Desktop):</strong> Look for the install icon <strong>⊕</strong> in the address bar (top right). Click it → "Install".<br><br><strong>On Android (Chrome):</strong> Tap the <strong>⋮ three-dot menu</strong> → "Add to Home Screen" → Install.<br><br><strong>On iPhone / iPad (Safari):</strong> Tap the <strong>Share button</strong> (rectangle with arrow) → "Add to Home Screen".<br><br>Once installed, StudyOS opens like a native app — no browser needed, works offline too.`,
    },
  ];

  const STEPS_MOBILE = [
    {
      target: null,
      position: 'center',
      title: 'Welcome to StudyOS! 👋',
      body: 'Let\'s take a quick tour so you know your way around. This will only take a minute.',
    },
    {
      target: '#menu-toggle',
      position: 'bottom',
      title: 'Open the Sidebar',
      body: 'Tap the ☰ menu icon here to open the navigation sidebar. All the main sections of StudyOS live there.',
      beforeShow: () => {
        // Make sure sidebar is closed first so the hint makes sense
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop && backdrop.style.display !== 'none') {
          App && App.closeSidebar && App.closeSidebar();
        }
      },
    },
    {
      target: '#menu-toggle',
      position: 'bottom',
      title: 'Inside the Sidebar',
      body: 'You\'ll find: Dashboard, Subjects, Study Log, AI Coach, Focus Timer, Daily Tasks, Revisions, Exam Scores, Doubts, and more.',
      beforeShow: () => {
        // Open sidebar so user can see it
        App && App.toggleSidebar && App.toggleSidebar();
      },
    },
    {
      target: '[data-page="subjects"].nav-item',
      position: 'right',
      title: 'Subjects & Chapters',
      body: 'All your CBSE chapters, by subject. Mark chapters done, log revisions, and track your syllabus completion.',
    },
    {
      target: '[data-page="coach"].nav-item',
      position: 'right',
      title: 'AI Study Coach',
      body: 'Ask anything — get instant explanations for any CBSE topic. Available 24/7, completely personalized to you.',
    },
    {
      target: '#nav-group-track-header',
      position: 'right',
      title: 'Track Section',
      body: 'Tap "Track" to expand Daily Tasks, Revisions, Exam Scores, Doubts, and Planning. These keep your preparation on point.',
    },
    {
      target: null,
      position: 'center',
      title: 'More Section — Analytics & Rewards',
      body: 'In the sidebar, scroll down and tap <strong>"More"</strong> to find:<br><br>📊 <strong>Analytics</strong> — weekly & monthly study stats<br>🏆 <strong>Rewards</strong> — XP, levels, and badges<br>⚙️ <strong>Settings</strong> — customize your workspace',
      beforeShow: () => {
        App && App.closeSidebar && App.closeSidebar();
      },
    },
    {
      target: '.mob-log-btn',
      position: 'top',
      title: 'Log a Session',
      body: 'This center button is your Quick Log. After any study session, tap it to record your time. That\'s how your streak grows.',
    },
    {
      target: null,
      position: 'center',
      title: '📲 Install StudyOS on Your Phone',
      body: `<strong>On Android (Chrome):</strong><br>Tap the <strong>⋮ three-dot menu</strong> in the top-right of Chrome → tap <strong>"Add to Home Screen"</strong> → Install.<br><br><strong>On iPhone (Safari):</strong><br>Tap the <strong>Share button</strong> (rectangle with ↑ arrow at the bottom) → tap <strong>"Add to Home Screen"</strong>.<br><br>StudyOS will work like a real app on your phone — launches instantly, works offline!`,
    },
  ];

  // ─── State ────────────────────────────────────────────────────────────────
  let steps = [];
  let currentStep = 0;
  let tooltipEl = null;
  let arrowEl = null;
  let highlightedEl = null;

  // ─── Styles ───────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('sos-tour-styles')) return;
    const s = document.createElement('style');
    s.id = 'sos-tour-styles';
    s.textContent = `
      #sos-tooltip {
        position: fixed;
        z-index: 99999;
        width: 310px;
        max-width: calc(100vw - 24px);
        background: var(--color-surface, #1c1c2e);
        border: 1px solid rgba(245,158,11,0.25);
        border-radius: 14px;
        padding: 18px 18px 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        font-family: var(--font-body, 'Inter', sans-serif);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: all;
      }
      #sos-tooltip.sos-show {
        opacity: 1;
        transform: translateY(0);
      }
      #sos-tooltip.sos-center {
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -46%) !important;
      }
      #sos-tooltip.sos-center.sos-show {
        transform: translate(-50%, -50%) !important;
      }
      #sos-arrow {
        position: fixed;
        z-index: 99998;
        width: 10px;
        height: 10px;
        background: var(--color-surface, #1c1c2e);
        border: 1px solid rgba(245,158,11,0.25);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      #sos-arrow.sos-show { opacity: 1; }
      .sos-eyebrow {
        font-size: 0.67rem;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--color-warning, #f59e0b);
        margin-bottom: 5px;
      }
      .sos-title {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--color-text, #f1f5f9);
        margin: 0 0 7px;
        line-height: 1.3;
      }
      .sos-body {
        font-size: 0.8rem;
        color: var(--color-text-secondary, #94a3b8);
        line-height: 1.6;
        margin: 0 0 14px;
      }
      .sos-body strong { color: var(--color-text, #f1f5f9); }
      .sos-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .sos-dots {
        display: flex;
        gap: 4px;
        align-items: center;
        flex-shrink: 0;
      }
      .sos-dot {
        width: 5px; height: 5px;
        border-radius: 50%;
        background: rgba(255,255,255,0.15);
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .sos-dot.on {
        background: var(--color-warning, #f59e0b);
        width: 16px;
        border-radius: 3px;
      }
      .sos-btns { display: flex; gap: 6px; }
      .sos-btn {
        font-family: var(--font-body, 'Inter', sans-serif);
        font-size: 0.76rem;
        font-weight: 600;
        padding: 6px 13px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        line-height: 1;
        transition: opacity 0.15s, transform 0.1s;
      }
      .sos-btn:active { transform: scale(0.95); }
      .sos-skip {
        background: transparent;
        color: var(--color-text-secondary, #64748b);
        padding: 6px 2px;
      }
      .sos-skip:hover { color: var(--color-text, #f1f5f9); }
      .sos-next {
        background: var(--color-warning, #f59e0b);
        color: #000;
      }
      .sos-next:hover { opacity: 0.88; }
      .sos-ring {
        outline: 2px solid var(--color-warning, #f59e0b) !important;
        outline-offset: 4px !important;
        border-radius: 8px;
        position: relative;
        z-index: 9999;
      }
    `;
    document.head.appendChild(s);
  }

  // ─── Build DOM ────────────────────────────────────────────────────────────
  function buildDOM() {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sos-tooltip';
    tooltipEl.setAttribute('role', 'dialog');

    arrowEl = document.createElement('div');
    arrowEl.id = 'sos-arrow';

    document.body.appendChild(arrowEl);
    document.body.appendChild(tooltipEl);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  function render(index) {
    const step = steps[index];
    const total = steps.length;
    const isLast = index === total - 1;

    const dots = steps.map((_, i) =>
      `<span class="sos-dot ${i === index ? 'on' : ''}"></span>`
    ).join('');

    tooltipEl.innerHTML = `
      <div class="sos-eyebrow">Step ${index + 1} of ${total}</div>
      <div class="sos-title">${step.title}</div>
      <div class="sos-body">${step.body}</div>
      <div class="sos-footer">
        <div class="sos-dots">${dots}</div>
        <div class="sos-btns">
          <button class="sos-btn sos-skip" id="sos-skip-btn">Skip tour</button>
          <button class="sos-btn sos-next" id="sos-next-btn">
            ${isLast ? 'Done 🎉' : 'Next →'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('sos-next-btn').onclick = advance;
    document.getElementById('sos-skip-btn').onclick = end;
  }

  // ─── Position ─────────────────────────────────────────────────────────────
  function position(step) {
    tooltipEl.classList.remove('sos-center');
    arrowEl.style.display = 'block';

    let target = step.target ? document.querySelector(step.target) : null;
    if (!target && step.fallback) target = document.querySelector(step.fallback);

    if (!target || step.position === 'center') {
      tooltipEl.classList.add('sos-center');
      tooltipEl.style.left = '';
      tooltipEl.style.top = '';
      arrowEl.style.display = 'none';
      return null;
    }

    const GAP = 12;
    const rect = target.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth || 310;
    const th = tooltipEl.offsetHeight || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;

    // On mobile, prefer bottom/top over right/left to avoid sidebar overlap
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

  function setArrow(left, top, borderCss) {
    arrowEl.style.cssText = `
      position:fixed; z-index:99998;
      width:10px; height:10px;
      background:var(--color-surface,#1c1c2e);
      border:1px solid rgba(245,158,11,0.25);
      pointer-events:none;
      left:${left}px; top:${top}px;
      ${borderCss};
    `;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

  // ─── Show step ────────────────────────────────────────────────────────────
  function showStep(index) {
    // Clear previous highlight
    if (highlightedEl) {
      highlightedEl.classList.remove('sos-ring');
      highlightedEl = null;
    }

    // Hide for transition
    tooltipEl.classList.remove('sos-show');
    arrowEl.classList.remove('sos-show');

    const step = steps[index];

    // Run any pre-show hook (e.g. expand nav group)
    if (step.beforeShow) {
      try { step.beforeShow(); } catch(e) {}
    }

    render(index);

    // Double rAF: wait for layout + paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = position(step);
        if (target) {
          highlightedEl = target;
          target.classList.add('sos-ring');
          // Scroll element into view if needed
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        tooltipEl.classList.add('sos-show');
        arrowEl.classList.add('sos-show');
      });
    });
  }

  // ─── Advance / End ────────────────────────────────────────────────────────
  function advance() {
    currentStep++;
    if (currentStep >= steps.length) {
      end();
    } else {
      showStep(currentStep);
    }
  }

  function end() {
    tooltipEl.classList.remove('sos-show');
    arrowEl.classList.remove('sos-show');

    setTimeout(() => {
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
      if (arrowEl)   { arrowEl.remove();   arrowEl   = null; }
      if (highlightedEl) {
        highlightedEl.classList.remove('sos-ring');
        highlightedEl = null;
      }
    }, 220);

    localStorage.setItem(TOUR_KEY, '1');
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  function start() {
    if (localStorage.getItem(TOUR_KEY)) return; // Already seen — never show again

    steps = isMobile() ? STEPS_MOBILE : STEPS_DESKTOP;
    currentStep = 0;

    injectStyles();
    buildDOM();
    showStep(0);
  }

  window.StudyOSTour = {
    start,
    reset: () => localStorage.removeItem(TOUR_KEY), // dev/testing helper
  };

})();