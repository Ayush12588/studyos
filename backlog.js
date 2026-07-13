/**
 * backlog.js — StudyOS Backlog Module v3
 *
 * CBSE marks data is inlined — no external cbse_marks.js dependency needed.
 *
 * Critical tier:  4-state status · board marks · marks-at-risk · time estimates
 * High Impact:    Quick Wins · Recovery plan · Today's Focus · Snooze with commitment
 *
 * Requires: db.js (window.DB, window.supabase), app.js (App)
 * Exposes:  window.Backlog
 *
 * app.js hook (already added):
 *   if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
 */

(function () {
  'use strict';

  // ─── CBSE Marks Data (inlined) ────────────────────────────────────────────
  // Source: CBSE official curriculum 2024–25. Theory marks only.
  // Keys: '9' | '10' | '11_PCM' | '11_PCB' | '11_Commerce' | '12_PCM' | '12_PCB' | '12_Commerce'

  const _CBSE = {
    '9': {
      'Mathematics': { 'Number Systems':8,'Polynomials':5,'Coordinate Geometry':4,'Linear Equations in Two Variables':4,"Introduction to Euclid's Geometry":2,'Lines and Angles':6,'Triangles':6,'Quadrilaterals':4,'Circles':6,"Heron's Formula":5,'Surface Areas and Volumes':10,'Statistics':10 },
      'Science': { 'Matter in Our Surroundings':7,'Is Matter Around Us Pure':7,'Atoms and Molecules':6,'Structure of the Atom':6,'The Fundamental Unit of Life':6,'Tissues':6,'Motion':7,'Force and Laws of Motion':7,'Gravitation':7,'Work and Energy':6,'Sound':6,'Why Do We Fall Ill':5,'Natural Resources':4 },
      'Social Science': { 'The French Revolution':6,'Socialism in Europe and the Russian Revolution':5,'Nazism and the Rise of Hitler':5,'Forest Society and Colonialism':4,'Pastoralists in the Modern World':4,'India — Size and Location':3,'Physical Features of India':5,'Drainage':4,'Climate':5,'Natural Vegetation and Wildlife':4,'Population':4,'What is Democracy? Why Democracy?':5,'Constitutional Design':5,'Electoral Politics':4,'Working of Institutions':5,'Democratic Rights':4,'The Story of Village Palampur':5,'People as Resource':5,'Poverty as a Challenge':5,'Food Security in India':5 },
      'English': { 'The Fun They Had':3,'The Sound of Music':3,'The Little Girl':3,'A Truly Beautiful Mind':3,'The Snake and the Mirror':3,'My Childhood':3,'Packing':3,'Reach for the Top':3,'The Bond of Love':3,'Kathmandu':3,'If I Were You':3,'The Road Not Taken (Poem)':2,'Wind (Poem)':2,'Rain on the Roof (Poem)':2,'The Lake Isle of Innisfree (Poem)':2,'A Legend of the Northland (Poem)':2,'No Men Are Foreign (Poem)':2,'The Duck and the Kangaroo (Poem)':2,'On Killing a Tree (Poem)':2,'The Snake Trying (Poem)':2,'A Slumber Did My Spirit Seal (Poem)':2 },
    },
    '10': {
      'Mathematics': { 'Real Numbers':6,'Polynomials':4,'Linear Equations in Two Variables':6,'Quadratic Equations':7,'Arithmetic Progressions':6,'Triangles':8,'Coordinate Geometry':6,'Intro to Trigonometry':6,'Applications of Trigonometry':6,'Circles':5,'Areas Related to Circles':4,'Surface Areas & Volumes':6,'Statistics':6,'Probability':4 },
      'Science': { 'Chemical Reactions & Equations':7,'Acids, Bases & Salts':7,'Metals & Non-metals':7,'Carbon & its Compounds':7,'Life Processes':7,'Control & Coordination':6,'How do Organisms Reproduce':6,'Heredity & Evolution':7,'Light: Reflection & Refraction':7,'Human Eye & Colourful World':5,'Electricity':7,'Magnetic Effects of Current':6,'Our Environment':3 },
      'Social Science': { 'Rise of Nationalism in Europe':5,'Nationalism in India':5,'Making of a Global World':4,'Age of Industrialisation':4,'Print Culture & Modern World':4,'Resources & Development':5,'Forest & Wildlife Resources':4,'Water Resources':4,'Agriculture':5,'Minerals & Energy Resources':4,'Manufacturing Industries':4,'Lifelines of National Economy':4,'Power Sharing':5,'Federalism':5,'Political Parties':5,'Outcomes of Democracy':3,'Development':5,'Sectors of Indian Economy':5,'Money & Credit':5,'Globalisation & Indian Economy':5 },
      'English': { 'A Letter to God': 2, 'Dust of Snow (Poem)': 1, 'Fire and Ice (Poem)': 1, 'Nelson Mandela: Long Walk to Freedom': 2, 'Two Stories about Flying': 2, 'A Tiger in the Zoo (Poem)': 1, 'How to Tell Wild Animals (Poem)': 1, 'From the Diary of Anne Frank': 2, 'The Ball Poem (Poem)': 1, 'The Hundred Dresses – I': 2, 'The Hundred Dresses – II': 2, 'Amanda! (Poem)': 1, 'Glimpses of India': 2, 'The Trees (Poem)': 1, 'Mijbil the Otter': 2, 'Fog (Poem)': 1, 'Madam Rides the Bus': 2, 'The Tale of Custard the Dragon (Poem)': 1, 'The Sermon at Benares': 2, 'For Anne Gregory (Poem)': 1, 'The Proposal': 3, 'A Triumph of Surgery': 2, 'The Thief\'s Story': 2, 'The Midnight Visitor': 2, 'A Question of Trust': 2, 'Footprints Without Feet': 2, 'The Making of a Scientist': 2, 'The Necklace': 2, 'The Hack Driver': 2, 'Bholi': 2, 'The Book that Saved the Earth': 2 },    },
    '11_PCM': {
      'Physics': { 'Physical World':2,'Units and Measurements':5,'Motion in a Straight Line':7,'Motion in a Plane':7,'Laws of Motion':8,'Work, Energy and Power':7,'System of Particles and Rotational Motion':8,'Gravitation':6,'Mechanical Properties of Solids':4,'Mechanical Properties of Fluids':4,'Thermal Properties of Matter':5,'Thermodynamics':5,'Kinetic Theory':3,'Oscillations':5,'Waves':4 },
      'Chemistry': { 'Some Basic Concepts of Chemistry':7,'Structure of Atom':6,'Classification of Elements and Periodicity in Properties':5,'Chemical Bonding and Molecular Structure':7,'Thermodynamics':7,'Equilibrium':7,'Redox Reactions':4,'Organic Chemistry — Some Basic Principles and Techniques':7,'Hydrocarbons':7,'Environmental Chemistry':3,'States of Matter':5,'The s-Block Elements':4,'The p-Block Elements (Groups 13 and 14)':4,'Hydrogen':3 },
      'Mathematics': { 'Sets':5,'Relations and Functions':6,'Trigonometric Functions':8,'Principle of Mathematical Induction':3,'Complex Numbers and Quadratic Equations':6,'Linear Inequalities':4,'Permutations and Combinations':6,'Binomial Theorem':5,'Sequences and Series':6,'Straight Lines':6,'Conic Sections':8,'Introduction to Three Dimensional Geometry':4,'Limits and Derivatives':8,'Statistics':5,'Probability':5 },
      'English': { 'The Portrait of a Lady':4,"We're Not Afraid to Die":4,'Discovering Tut: The Saga Continues':3,'Landscape of the Soul':3,'The Ailing Planet':3,'The Browning Version':4,'The Adventure':3,'Silk Road':3,'The Summer of the Beautiful White Horse':4,'The Address':3,"Ranga's Marriage":3,'Albert Einstein at School':3,"Mother's Day":3,'The Ghat of the Only World':3,'Birth':3,'The Tale of Melon City':3,'A Photograph (Poem)':2,'The Laburnum Top (Poem)':2,'The Voice of the Rain (Poem)':2,'Childhood (Poem)':2,'Father to Son (Poem)':2 },
    },
    '11_PCB': {
      'Physics': { 'Physical World':2,'Units and Measurements':5,'Motion in a Straight Line':7,'Motion in a Plane':7,'Laws of Motion':8,'Work, Energy and Power':7,'System of Particles and Rotational Motion':8,'Gravitation':6,'Mechanical Properties of Solids':4,'Mechanical Properties of Fluids':4,'Thermal Properties of Matter':5,'Thermodynamics':5,'Kinetic Theory':3,'Oscillations':5,'Waves':4 },
      'Chemistry': { 'Some Basic Concepts of Chemistry':7,'Structure of Atom':6,'Classification of Elements and Periodicity in Properties':5,'Chemical Bonding and Molecular Structure':7,'Thermodynamics':7,'Equilibrium':7,'Redox Reactions':4,'Organic Chemistry — Some Basic Principles and Techniques':7,'Hydrocarbons':7,'Environmental Chemistry':3,'States of Matter':5,'The s-Block Elements':4,'The p-Block Elements (Groups 13 and 14)':4,'Hydrogen':3 },
      'Biology': { 'The Living World':4,'Biological Classification':5,'Plant Kingdom':5,'Animal Kingdom':6,'Morphology of Flowering Plants':6,'Anatomy of Flowering Plants':5,'Structural Organisation in Animals':5,'Cell: The Unit of Life':7,'Biomolecules':6,'Cell Cycle and Cell Division':6,'Transport in Plants':5,'Mineral Nutrition':4,'Photosynthesis in Higher Plants':5,'Respiration in Plants':5,'Plant Growth and Development':4,'Digestion and Absorption':5,'Breathing and Exchange of Gases':5,'Body Fluids and Circulation':5,'Excretory Products and their Elimination':5,'Locomotion and Movement':5,'Neural Control and Coordination':6,'Chemical Coordination and Integration':5 },
      'English': { 'The Portrait of a Lady':4,"We're Not Afraid to Die":4,'Discovering Tut: The Saga Continues':3,'Landscape of the Soul':3,'The Ailing Planet':3,'The Browning Version':4,'The Adventure':3,'Silk Road':3,'The Summer of the Beautiful White Horse':4,'The Address':3,"Ranga's Marriage":3,'Albert Einstein at School':3,"Mother's Day":3,'The Ghat of the Only World':3,'Birth':3,'The Tale of Melon City':3,'A Photograph (Poem)':2,'The Laburnum Top (Poem)':2,'The Voice of the Rain (Poem)':2,'Childhood (Poem)':2,'Father to Son (Poem)':2 },
    },
    '11_Commerce': {
      'Accountancy': { 'Introduction to Accounting':6,'Theory Base of Accounting':6,'Recording of Transactions I':8,'Recording of Transactions II':8,'Bank Reconciliation Statement':6,'Trial Balance and Rectification of Errors':6,'Depreciation, Provisions and Reserves':8,'Bill of Exchange':6,'Financial Statements I':8,'Financial Statements II':6,'Accounts from Incomplete Records':6,'Applications of Computers in Accounting':5,'Computerised Accounting System':5 },
      'Business Studies': { 'Nature and Purpose of Business':6,'Forms of Business Organisation':8,'Public, Private and Global Enterprises':6,'Business Services':6,'Emerging Modes of Business':5,'Social Responsibility of Business and Business Ethics':5,'Formation of a Company':6,'Sources of Business Finance':8,'Small Business':5,'Internal Trade':7,'International Business':6,'Financial Market':5,'Marketing':5,'Consumer Protection':4 },
      'Economics': { 'Introduction to Economics':4,'Collection of Data':5,'Organisation of Data':5,'Presentation of Data':5,'Measures of Central Tendency':8,'Measures of Dispersion':6,'Correlation':6,'Index Numbers':6,'Introduction to Microeconomics':4,'Theory of Consumer Behaviour':8,'Production and Costs':8,'The Theory of the Firm under Perfect Competition':6,'Market Equilibrium':6,'Non-competitive Markets':6 },
      'English': { 'The Portrait of a Lady':4,"We're Not Afraid to Die":4,'Discovering Tut: The Saga Continues':3,'Landscape of the Soul':3,'The Ailing Planet':3,'The Browning Version':4,'The Adventure':3,'Silk Road':3,'The Summer of the Beautiful White Horse':4,'The Address':3,"Ranga's Marriage":3,'Albert Einstein at School':3,"Mother's Day":3,'The Ghat of the Only World':3,'Birth':3,'The Tale of Melon City':3,'A Photograph (Poem)':2,'The Laburnum Top (Poem)':2,'The Voice of the Rain (Poem)':2,'Childhood (Poem)':2,'Father to Son (Poem)':2 },
    },
    '12_PCM': {
      'Physics': { 'Electric Charges and Fields':6,'Electrostatic Potential and Capacitance':6,'Current Electricity':8,'Moving Charges and Magnetism':6,'Magnetism and Matter':4,'Electromagnetic Induction':6,'Alternating Current':6,'Electromagnetic Waves':4,'Ray Optics and Optical Instruments':7,'Wave Optics':5,'Dual Nature of Radiation and Matter':5,'Atoms':4,'Nuclei':4,'Semiconductor Electronics':5,'Communication Systems':3 },
      'Chemistry': { 'Solutions':7,'Electrochemistry':7,'Chemical Kinetics':7,'The d- and f-Block Elements':5,'Coordination Compounds':7,'Haloalkanes and Haloarenes':6,'Alcohols, Phenols and Ethers':6,'Aldehydes, Ketones and Carboxylic Acids':7,'Amines':6,'Biomolecules':5,'Polymers':3,'Chemistry in Everyday Life':3,'Surface Chemistry':4,'General Principles and Processes of Isolation of Elements':3,'The p-Block Elements':4 },
      'Mathematics': { 'Relations and Functions':5,'Inverse Trigonometric Functions':5,'Matrices':6,'Determinants':6,'Continuity and Differentiability':8,'Applications of Derivatives':8,'Integrals':8,'Applications of the Integrals':5,'Differential Equations':6,'Vector Algebra':5,'Three Dimensional Geometry':7,'Linear Programming':5,'Probability':6 },
      'English': { 'The Last Lesson':4,'Lost Spring':4,'Deep Water':3,'The Rattrap':3,'Indigo':3,'Going Places':3,'Third Level':4,'The Tiger King':4,'Journey to the End of the Earth':3,'The Enemy':4,'Should Wizard Hit Mommy':3,'On the Face of It':3,'Evans Tries an O-Level':3,'Memories of Childhood':3,'My Mother at Sixty-Six (Poem)':2,'An Elementary School Classroom in a Slum (Poem)':2,'A Thing of Beauty (Poem)':2,'A Roadside Stand (Poem)':2,"Aunt Jennifer's Tigers (Poem)":2 },
    },
    '12_PCB': {
      'Physics': { 'Electric Charges and Fields':6,'Electrostatic Potential and Capacitance':6,'Current Electricity':8,'Moving Charges and Magnetism':6,'Magnetism and Matter':4,'Electromagnetic Induction':6,'Alternating Current':6,'Electromagnetic Waves':4,'Ray Optics and Optical Instruments':7,'Wave Optics':5,'Dual Nature of Radiation and Matter':5,'Atoms':4,'Nuclei':4,'Semiconductor Electronics':5,'Communication Systems':3 },
      'Chemistry': { 'Solutions':7,'Electrochemistry':7,'Chemical Kinetics':7,'The d- and f-Block Elements':5,'Coordination Compounds':7,'Haloalkanes and Haloarenes':6,'Alcohols, Phenols and Ethers':6,'Aldehydes, Ketones and Carboxylic Acids':7,'Amines':6,'Biomolecules':5,'Polymers':3,'Chemistry in Everyday Life':3,'Surface Chemistry':4,'General Principles and Processes of Isolation of Elements':3,'The p-Block Elements':4 },
      'Biology': { 'Reproduction in Organisms':5,'Sexual Reproduction in Flowering Plants':8,'Human Reproduction':8,'Reproductive Health':5,'Principles of Inheritance and Variation':8,'Molecular Basis of Inheritance':8,'Evolution':6,'Human Health and Disease':7,'Strategies for Enhancement in Food Production':5,'Microbes in Human Welfare':5,'Biotechnology: Principles and Processes':6,'Biotechnology and its Applications':5,'Organisms and Populations':6,'Ecosystem':6,'Biodiversity and Conservation':4,'Environmental Issues':3 },
      'English': { 'The Last Lesson':4,'Lost Spring':4,'Deep Water':3,'The Rattrap':3,'Indigo':3,'Going Places':3,'Third Level':4,'The Tiger King':4,'Journey to the End of the Earth':3,'The Enemy':4,'Should Wizard Hit Mommy':3,'On the Face of It':3,'Evans Tries an O-Level':3,'Memories of Childhood':3,'My Mother at Sixty-Six (Poem)':2,'An Elementary School Classroom in a Slum (Poem)':2,'A Thing of Beauty (Poem)':2,'A Roadside Stand (Poem)':2,"Aunt Jennifer's Tigers (Poem)":2 },
    },
    '12_Commerce': {
      'Accountancy': { 'Accounting for Partnership Firms — Fundamentals':10,'Reconstitution of Partnership':10,'Dissolution of Partnership Firm':8,'Accounting for Share Capital':10,'Issue and Redemption of Debentures':8,'Financial Statements of Companies':8,'Financial Statement Analysis':6,'Cash Flow Statement':8,'Accounting Ratios':6,'Computerised Accounting System':6 },
      'Business Studies': { 'Nature and Significance of Management':5,'Principles of Management':7,'Business Environment':5,'Planning':6,'Organising':7,'Staffing':7,'Directing':7,'Controlling':5,'Financial Management':8,'Financial Market':8,'Marketing Management':8,'Consumer Protection':5,'Entrepreneurship Development':2 },
      'Economics': { 'National Income Accounting':10,'Money and Banking':8,'Determination of Income and Employment':10,'Government Budget and the Economy':8,'Balance of Payments':6,'Indian Economy on the Eve of Independence':6,'Indian Economy 1950–1990':6,'Economic Reforms Since 1991':6,'Poverty':5,'Human Capital Formation in India':5,'Rural Development':5,'Employment: Growth, Informalisation and Other Issues':5,'Infrastructure':5,'Environment and Sustainable Development':5,'Comparative Development Experiences of India and its Neighbours':4 },
      'English': { 'The Last Lesson':4,'Lost Spring':4,'Deep Water':3,'The Rattrap':3,'Indigo':3,'Going Places':3,'Third Level':4,'The Tiger King':4,'Journey to the End of the Earth':3,'The Enemy':4,'Should Wizard Hit Mommy':3,'On the Face of It':3,'Evans Tries an O-Level':3,'Memories of Childhood':3,'My Mother at Sixty-Six (Poem)':2,'An Elementary School Classroom in a Slum (Poem)':2,'A Thing of Beauty (Poem)':2,'A Roadside Stand (Poem)':2,"Aunt Jennifer's Tigers (Poem)":2 },
    },
  };

  function _cbseKey(classNum, stream) {
    const c = String(classNum);
    if (c === '9' || c === '10') return c;
    if (c === '11' || c === '12') {
      const s = (stream || '').toUpperCase();
      if (s === 'PCB')                        return `${c}_PCB`;
      if (s === 'COMMERCE')                   return `${c}_Commerce`;
      return `${c}_PCM`;
    }
    return null;
  }

  function _lookupMarks(classNum, stream, subject, chapter) {
    const key  = _cbseKey(classNum, stream);
    if (!key) return 0;
    const data = _CBSE[key];
    if (!data) return 0;
    const sub  = data[subject];
    if (!sub) return 0;
    return sub[chapter] || 0;
  }

  // ─── Constants ────────────────────────────────────────────────────────────

  const STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    DONE_SHAKY:  'done_shaky',
    MASTERED:    'mastered',
  };

  const TIME_ESTIMATES = {
    chapter_unstarted: 120,
    lecture_pending:    90,
    questions_pending:  60,
    revision_pending:   35,
  };

  const TYPE_LABELS = {
    lecture_pending:   'Lecture Pending',
    revision_pending:  'Revision Pending',
    questions_pending: 'Questions Pending',
    chapter_unstarted: 'Chapter Not Started',
  };

  const STATUS_LABELS = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    done_shaky:  'Done — Shaky',
    mastered:    'Mastered',
  };

  const STATUS_COLORS = {
    not_started: 'var(--color-danger,#ef4444)',
    in_progress: 'var(--color-warning,#f59e0b)',
    done_shaky:  '#a78bfa',
    mastered:    'var(--color-success,#22c55e)',
  };

  const TYPE_SVG = {
    lecture_pending:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    revision_pending:  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>`,
    questions_pending: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    chapter_unstarted: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function daysSince(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  function formatAge(dateStr) {
    const d = daysSince(dateStr);
    if (d === 0) return 'Today';
    if (d === 1) return '1 day ago';
    return `${d} days ago`;
  }

  function pColor(p) {
    if (p === 'high')   return 'var(--color-danger,#ef4444)';
    if (p === 'medium') return 'var(--color-warning,#f59e0b)';
    return 'var(--text-muted,#6b7280)';
  }

  function priorityOrder(p) { return p === 'high' ? 0 : p === 'medium' ? 1 : 2; }

  function toast(msg, type) { if (App?.toast) App.toast(msg, type || 'info'); }

  function getUserId() { return window._supabaseUserId || null; }

  function updateNavBadge(count) {
    const badge = document.getElementById('backlog-nav-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  function computePriority(createdAt, dueDate) {
    const age        = daysSince(createdAt);
    const until      = daysUntil(dueDate);
    const daysToExam = App?.getDaysToExam?.() ?? null;
    if (until !== null && until <= 2)             return 'high';
    if (daysToExam !== null && daysToExam >= 0) {
      if (daysToExam <= 14)                       return 'high';
      if (daysToExam <= 30 && age >= 3)           return 'high';
      if (daysToExam <= 60 && age >= 10)          return 'high';
      if (daysToExam <= 30)                       return 'medium';
      if (daysToExam <= 60 && age >= 3)           return 'medium';
      return 'low';
    }
    if (age >= 14) return 'high';
    if (age >= 5)  return 'medium';
    return 'low';
  }

  // Sort: priority first, then marks descending (more marks = shown earlier), then age
  function sortScore(item) {
    const p = priorityOrder(item.priority) * 10000;
    const m = (100 - (item.board_marks || 0)) * 100;
    const a = -daysSince(item.created_at);
    return p + m + a;
  }

  function getBoardMarks(subject, chapter) {
    if (!App?.state?.profile) return 0;
    const cls    = App.state.profile.selectedClass  || 10;
    const stream = App.state.profile.selectedStream || null;
    return _lookupMarks(cls, stream, subject, chapter);
  }

  function getTimeEstimate(type) { return TIME_ESTIMATES[type] || 60; }

  function isActive(item) { return item.status !== STATUS.MASTERED; }

  // ─── Recovery-hours sync helper ───────────────────────────────────────────
  // Snaps a minute value to the nearest dropdown option.
  // Extracted so both init() and renderPage() can call it.

  const RECOVERY_HOUR_OPTIONS = [1, 1.5, 2, 3, 4];

  function _snapToRecoveryOption(goalMinutes) {
    if (!goalMinutes || goalMinutes <= 0) return null;   // caller keeps current default
    const goalHours = goalMinutes / 60;
    return RECOVERY_HOUR_OPTIONS.reduce((best, opt) =>
      Math.abs(opt - goalHours) < Math.abs(best - goalHours) ? opt : best
    );
  }

  // ─── Main Object ──────────────────────────────────────────────────────────

  const Backlog = {
    state: {
      items:         [],
      loading:       false,
      filter:        'all',
      recoveryHours: 2,             // hard default until settings sync or manual override
      _userOverrodeRecoveryHours: false // true only once the user picks a value via the dropdown
    },

    // ── Bootstrap ────────────────────────────────────────────────────────────

    async init(userId) {
      if (!userId) return;
      this._syncRecoveryHoursFromSettings();
      await this._loadItems(userId);
      this._refreshDashboardWidget();
      updateNavBadge(this._activeItems().length);
    },

    // Pull daily_study_goal from profile and snap to nearest dropdown option.
    // Re-checks on every call (init, every renderPage) rather than locking
    // after one attempt — the profile fetch can still be unresolved or
    // stale on an early call, so a single permanent lock risks freezing in
    // a wrong value if the settings change later. The ONLY thing that
    // permanently stops this auto-sync is the user manually picking a
    // value via the dropdown (see setRecoveryHours, which sets
    // _userOverrodeRecoveryHours).
    _syncRecoveryHoursFromSettings() {
      if (this.state._userOverrodeRecoveryHours) return;  // respect manual choice, permanently
      const mins = App?.state?.profile?.dailyGoalMinutes;
      const snapped = _snapToRecoveryOption(mins);
      if (snapped === null) return;                       // profile not ready yet — try again next call
      this.state.recoveryHours = snapped;
    },

    // ── Data ─────────────────────────────────────────────────────────────────

    async _loadItems(userId) {
      this.state.loading = true;
      const { data, error } = await DB.backlog.getActive(userId);
      this.state.loading = false;
      if (error) { console.error('[Backlog] load error:', error); return; }

      const items = (data || []).map(item => {
        const freshPriority  = computePriority(item.created_at, item.due_date);
        const board_marks    = item.board_marks    != null ? item.board_marks    : getBoardMarks(item.subject, item.chapter);
        const time_estimate  = item.time_estimate_mins != null ? item.time_estimate_mins : getTimeEstimate(item.type);
        const status         = item.status || STATUS.NOT_STARTED;

        if (freshPriority !== item.priority) {
          window.supabase?.from('backlog_items')
            .update({ priority: freshPriority }).eq('id', item.id).then(() => {});
        }
        return { ...item, priority: freshPriority, board_marks, time_estimate_mins: time_estimate, status };
      });

      items.sort((a, b) => sortScore(a) - sortScore(b));
      this.state.items = items;
    },

    _activeItems() { return this.state.items.filter(isActive); },

    // ── Stats ─────────────────────────────────────────────────────────────────

    _stats() {
      const active = this._activeItems();
      const marksAtRisk = active
        .filter(i => i.status === STATUS.NOT_STARTED || i.status === STATUS.DONE_SHAKY)
        .reduce((sum, i) => sum + (i.board_marks || 0), 0);
      const totalMins  = active.reduce((sum, i) => sum + (i.time_estimate_mins || 60), 0);
      const totalHours = Math.round((totalMins / 60) * 10) / 10;
      const shakyClearByDays = this.state.recoveryHours > 0
        ? Math.ceil(totalMins / (this.state.recoveryHours * 60))
        : null;
      const clearByDate = shakyClearByDays != null ? (() => {
        const d = new Date(); d.setDate(d.getDate() + shakyClearByDays);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      })() : null;

      return {
        total: active.length,
        high:  active.filter(i => i.priority === 'high').length,
        shaky: active.filter(i => i.status === STATUS.DONE_SHAKY).length,
        marksAtRisk, totalHours, clearByDate, shakyClearByDays,
      };
    },

    // ── Actions ───────────────────────────────────────────────────────────────

    async addItem(userId, { subject, chapter, topic, type, dueDate, source }) {
      if (!subject || !chapter || !type) { toast('Subject, chapter, and type are required', 'warning'); return false; }
      const isDupe = await DB.backlog.hasDuplicate(userId, subject, chapter, type);
      if (isDupe) { toast(`${TYPE_LABELS[type]} for "${chapter}" already in backlog`, 'warning'); return false; }

      const priority      = computePriority(new Date().toISOString(), dueDate);
      const board_marks   = getBoardMarks(subject, chapter);
      const time_estimate = getTimeEstimate(type);

      const { data, error } = await DB.backlog.create({
        user_id: userId, subject, chapter, topic: topic || null, type,
        source: source || 'manual', priority, due_date: dueDate || null,
        status: STATUS.NOT_STARTED, board_marks, time_estimate_mins: time_estimate,
      });

      if (error) {
        if (error.code === '23505') { toast('Already in backlog', 'warning'); return false; }
        console.error('[Backlog] create error:', error);
        toast('Failed to add item', 'error');
        return false;
      }

      const newItem = { ...data, priority, board_marks, time_estimate_mins: time_estimate, status: STATUS.NOT_STARTED };
      this.state.items.unshift(newItem);
      this.state.items.sort((a, b) => sortScore(a) - sortScore(b));
      this._afterChange();
      const marksNote = board_marks > 0 ? ` · ${board_marks}M in boards` : '';
      toast(`Added: ${chapter}${marksNote}`, 'success');
      
      if (window.Notifications) {
        Notifications.send('backlog_alert', `New backlog item added`, `${subject} — ${chapter}`, 'backlog');
      }

      return true;
    },

    async advanceStatus(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item) return;
      if (item.status === STATUS.DONE_SHAKY) { this._openConfidenceModal(item); return; }
      const next = item.status === STATUS.NOT_STARTED ? STATUS.IN_PROGRESS : STATUS.DONE_SHAKY;
      const { error } = await window.supabase.from('backlog_items').update({ status: next }).eq('id', item.id);
      if (error) { toast('Could not update status', 'error'); return; }
      item.status = next;
      this._afterChange();
      if (App?.state?.currentPage === 'backlog') this.renderPage();
      if (next === STATUS.DONE_SHAKY) setTimeout(() => this._openConfidenceModal(item), 300);
      else toast(`${item.chapter} — ${STATUS_LABELS[next]}`, 'info');
    },

    async markComplete(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item) return;
      const { error } = await window.supabase.from('backlog_items').update({ status: STATUS.DONE_SHAKY }).eq('id', item.id);
      if (error) { toast('Could not update', 'error'); return; }
      item.status = STATUS.DONE_SHAKY;
      this._afterChange();
      if (App?.state?.currentPage === 'backlog') this.renderPage();
      setTimeout(() => this._openConfidenceModal(item), 300);
    },

    _openConfidenceModal(item) {
      document.getElementById('bl-conf-chapter').textContent = item.chapter;
      document.getElementById('modal-backlog-confidence').dataset.itemId = item.id;
      document.querySelectorAll('.bl-star').forEach(s => {
        s.classList.remove('selected');
        s.style.color = 'var(--text-muted)';
      });
      document.getElementById('bl-conf-hint').textContent = '';
      App.openModal('modal-backlog-confidence');
    },

    _onStarHover(star, on) {
      const val = parseInt(star.dataset.val);
      document.querySelectorAll('.bl-star').forEach(s => {
        const sv = parseInt(s.dataset.val);
        s.style.color = on
          ? (sv <= val ? '#f59e0b' : 'var(--text-muted)')
          : (s.classList.contains('selected') ? '#f59e0b' : 'var(--text-muted)');
      });
    },

    _onStarClick(star) {
      const val = parseInt(star.dataset.val);
      document.querySelectorAll('.bl-star').forEach(s => {
        const sv = parseInt(s.dataset.val);
        s.style.color = sv <= val ? '#f59e0b' : 'var(--text-muted)';
        s.classList.toggle('selected', sv <= val);
      });
      const hints = { 1:'Needs a lot of work — staying in backlog', 2:'Not confident yet — staying in backlog', 3:'Getting there — staying in backlog for review', 4:'Good — marking as mastered', 5:'Solid! Marked as mastered' };
      document.getElementById('bl-conf-hint').textContent = hints[val] || '';
    },

    async submitConfidence() {
      const modal      = document.getElementById('modal-backlog-confidence');
      const itemId     = modal.dataset.itemId;
      const stars      = document.querySelectorAll('.bl-star.selected');
      if (!stars.length) { toast('Rate your confidence first', 'warning'); return; }
      const selected   = stars[stars.length - 1]; // last selected = highest rated star
      const confidence = parseInt(selected.dataset.val);
      const isMastered = confidence >= 4;
      const newStatus  = isMastered ? STATUS.MASTERED : STATUS.DONE_SHAKY;

      const { error } = await window.supabase.from('backlog_items')
        .update({ status: newStatus, confidence, cleared_at: isMastered ? new Date().toISOString() : null })
        .eq('id', itemId);
      if (error) { toast('Could not save', 'error'); return; }

      App.closeModal('modal-backlog-confidence');
      const item = this.state.items.find(i => i.id === itemId);
      if (item) {
        item.status = newStatus; item.confidence = confidence;
        if (isMastered) {
          this.state.items = this.state.items.filter(i => i.id !== itemId);
          if (App?.addXP) App.addXP(10, 'Backlog item mastered');
          const remaining = this._activeItems().length;
          toast(remaining === 0 ? '🎉 Backlog cleared! No marks at risk.' : `✅ ${item.chapter} mastered! ${remaining} remaining`, 'success');
        } else {
          toast(`${item.chapter} — marked shaky, will resurface for review`, 'info');
        }
      }
      this._afterChange();
      if (App?.state?.currentPage === 'backlog') this.renderPage();
    },

    async openDismissModal(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item) return;
      document.getElementById('bl-dismiss-name').textContent = `${item.subject} · ${item.chapter}`;
      document.getElementById('modal-backlog-dismiss').dataset.itemId = itemId;
      document.querySelectorAll('input[name="bl-dismiss-reason"]').forEach(r => r.checked = false);
      const snoozeRow = document.getElementById('bl-snooze-days-row');
      if (snoozeRow) snoozeRow.style.display = 'none';
      App.openModal('modal-backlog-dismiss');
    },

    toggleSnoozeOptions(checked) {
      const snoozeRow = document.getElementById('bl-snooze-days-row');
      if (snoozeRow) snoozeRow.style.display = checked ? 'block' : 'none';
    },

    async confirmDismiss() {
      const modal  = document.getElementById('modal-backlog-dismiss');
      const itemId = modal.dataset.itemId;
      const sel    = modal.querySelector('input[name="bl-dismiss-reason"]:checked');
      if (!sel) { toast('Select a reason', 'warning'); return; }
      const reason = sel.value;
      const snooze = reason === 'postponed';
      let snoozeUntil = null;
      if (snooze) {
        const snoozeDaysVal = parseInt(document.getElementById('bl-snooze-days')?.value || '3');
        const daysToExam    = App?.getDaysToExam?.() ?? null;
        const actualDays    = snoozeDaysVal === -1 ? (daysToExam !== null && daysToExam > 0 ? daysToExam : 7) : snoozeDaysVal;
        const d = new Date(); d.setDate(d.getDate() + actualDays);
        snoozeUntil = d.toISOString().split('T')[0];
      }
      const { error } = await DB.backlog.dismiss(itemId, reason, snoozeUntil);
      if (error) { toast('Could not dismiss', 'error'); return; }
      App.closeModal('modal-backlog-dismiss');
      const dismissed = this.state.items.find(i => i.id === itemId);
      this.state.items = this.state.items.filter(i => i.id !== itemId);
      this._afterChange();
      if (App?.state?.currentPage === 'backlog') this.renderPage();
      const label = snooze ? `Snoozed until ${snoozeUntil}` : 'Dismissed';
      this._showUndo(label, async () => {
        const { error: e } = await DB.backlog.restore(itemId);
        if (e) { toast('Could not restore', 'error'); return; }
        this.state.items.unshift(dismissed);
        this.state.items.sort((a, b) => sortScore(a) - sortScore(b));
        this._afterChange();
        if (App?.state?.currentPage === 'backlog') this.renderPage();
        toast('Restored', 'info');
      });
    },

    async autoAddFromRevision(userId, subject, chapter) {
      await this.addItem(userId, { subject, chapter, type: 'revision_pending', source: 'auto_revision' });
    },

    // ── Post-Session Hook ─────────────────────────────────────────────────────

    onSessionLogged(subjectName, chapterName) {
      if (!chapterName || !subjectName) return;
      const match = this._activeItems().find(i =>
        i.subject.toLowerCase() === subjectName.toLowerCase() &&
        i.chapter.toLowerCase() === chapterName.toLowerCase()
      );
      if (!match) return;
      this._showBacklogClearPrompt(match);
    },

    _showBacklogClearPrompt(item) {
      document.getElementById('bl-session-prompt')?.remove();
      const el = document.createElement('div');
      el.id    = 'bl-session-prompt';
      const pc = pColor(item.priority);
      const marksNote = item.board_marks > 0 ? `${item.board_marks}M in boards · ` : '';
      el.innerHTML = `
        <button onclick="document.getElementById('bl-session-prompt')?.remove()"
          style="position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:1rem;color:var(--text-muted);line-height:1">×</button>
        <div style="font-size:.8rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;padding-right:16px">
          "${item.chapter}" is in your backlog
        </div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:10px">${marksNote}Ready to close the debt?</div>
        <div style="display:flex;gap:8px">
          <button onclick="Backlog._clearFromSessionPrompt('${item.id}')"
            style="flex:1;padding:7px 0;background:var(--accent,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600">
            Mark Done
          </button>
          <button onclick="document.getElementById('bl-session-prompt')?.remove()"
            style="flex:1;padding:7px 0;background:transparent;color:var(--text-muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:.78rem">
            Not yet
          </button>
        </div>`;
      Object.assign(el.style, {
        position:'fixed', bottom:'90px', right:'20px',
        background:'var(--color-surface,#1e1e2e)', border:`1px solid ${pc}`,
        borderRadius:'12px', padding:'14px 16px', zIndex:'9999',
        boxShadow:'0 8px 32px rgba(0,0,0,0.35)', width:'260px', animation:'blFadeUp .25s ease',
      });
      document.body.appendChild(el);
      setTimeout(() => document.getElementById('bl-session-prompt')?.remove(), 12000);
    },

    async _clearFromSessionPrompt(itemId) {
      document.getElementById('bl-session-prompt')?.remove();
      await this.markComplete(itemId);
    },

    // ── Push to Today ─────────────────────────────────────────────────────────

    async pushToToday(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item || !App) return;
      const today    = App.today?.() || new Date().toISOString().split('T')[0];
      const taskText = `[Backlog] ${TYPE_LABELS[item.type]}: ${item.subject} · ${item.chapter}`;
      const alreadyExists = (App.state.tasks || []).some(t => t.text === taskText && t.date === today);
      if (alreadyExists) { toast('Already in today\'s tasks', 'info'); return; }
      const newTask = { id: App.uid?.() || Date.now().toString(36), text: taskText, done: false, date: today, createdAt: Date.now() };
      App.state.tasks.push(newTask);
      const userId = getUserId();
      if (userId) {
        DB.tasks.create({ user_id: userId, text: taskText, done: false, date: today })
          .then(({ data, error }) => { if (!error && data?.id) newTask.id = data.id; });
      }
      App.save?.();
      toast('Added to today\'s tasks', 'success');
    },

    // ── Add Modal ─────────────────────────────────────────────────────────────

    // prefill (optional): { subjectName, chapterName } — when provided,
    // pre-selects subject + chapter instead of resetting to blank. Existing
    // callers that pass no argument keep the original blank-form behavior.
    async openAddModal(prefill) {
      if (!App?.state?.subjects?.length) await App?._loadTabData('subjects');
      const subjects   = App?.state?.subjects || [];
      const subjectSel = document.getElementById('bl-subject');
      subjectSel.innerHTML = subjects.length === 0
        ? `<option value="">No subjects — add subjects first</option>`
        : '<option value="">Select subject…</option>' +
          subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
      subjectSel.onchange = () => {
        const name       = subjectSel.value;
        const chapterSel = document.getElementById('bl-chapter');
        if (!name) { chapterSel.innerHTML = `<option value="">Select subject first…</option>`; return; }
        const subj     = subjects.find(s => s.name === name);
        const chapters = subj?.chapters || [];
        chapterSel.innerHTML = `<option value="">Select chapter…</option>` +
          chapters.map(c => {
            const marks = getBoardMarks(name, c.name);
            return `<option value="${c.name}">${c.name}${marks > 0 ? ` · ${marks}M` : ''}</option>`;
          }).join('');
      };
      document.getElementById('bl-topic').value = '';
      document.getElementById('bl-due').value   = '';
      document.querySelectorAll('input[name="bl-type"]').forEach(r => r.checked = false);

      if (prefill?.subjectName && subjects.some(s => s.name === prefill.subjectName)) {
        subjectSel.value = prefill.subjectName;
        subjectSel.onchange(); // populate chapter options for this subject
        const chapterSel = document.getElementById('bl-chapter');
        if (prefill.chapterName && [...chapterSel.options].some(o => o.value === prefill.chapterName)) {
          chapterSel.value = prefill.chapterName;
        }
      } else {
        document.getElementById('bl-chapter').innerHTML = `<option value="">Select subject first…</option>`;
      }
      App.openModal('modal-backlog-add');
    },

    async submitAdd() {
      const userId = getUserId();
      if (!userId) { toast('Not signed in', 'error'); return; }
      const subject = document.getElementById('bl-subject').value;
      const chapter = document.getElementById('bl-chapter').value;
      const topic   = document.getElementById('bl-topic').value.trim();
      const dueDate = document.getElementById('bl-due').value;
      const typeEl  = document.querySelector('input[name="bl-type"]:checked');
      if (!subject || !chapter || !typeEl) { toast('Fill in subject, chapter, and type', 'warning'); return; }
      const btn = document.getElementById('bl-add-btn');
      btn.disabled = true; btn.textContent = 'Adding…';
      const ok = await this.addItem(userId, { subject, chapter, topic, type: typeEl.value, dueDate });
      btn.disabled = false; btn.textContent = 'Add to Backlog';
      if (ok) { App.closeModal('modal-backlog-add'); if (App.state.currentPage === 'backlog') this.renderPage(); }
    },

    // ── Recovery Plan ─────────────────────────────────────────────────────────

    setRecoveryHours(h) {
      const parsed = parseFloat(h);
      if (isNaN(parsed) || parsed <= 0) return;
      this.state.recoveryHours = parsed;
      this.state._userOverrodeRecoveryHours = true; // user chose manually — never auto-sync over this again
      const el = document.getElementById('bl-recovery-plan');
      if (el) el.outerHTML = this._renderRecoveryPlan();
    },

    // ── Render: Dashboard Widget ──────────────────────────────────────────────

    renderDashboardWidget() {
      const active = this._activeItems();
      if (!active.length) return '';
      const stats = this._stats();
      const top   = active[0];
      const pc    = pColor(top.priority);
      const more  = active.length - 1;
      return `
        <div class="card bl-widget" style="border-left:3px solid ${pc};margin-bottom:12px">
          <div class="card-header" style="margin-bottom:10px">
            <span class="card-title" style="display:flex;align-items:center;gap:6px">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${pc}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Study Debt
            </span>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('backlog')" style="font-size:.72rem">View all (${active.length}) →</button>
          </div>
          ${stats.marksAtRisk > 0 ? `
            <div style="margin-bottom:10px;padding:8px 10px;background:rgba(239,68,68,0.08);border-radius:7px;border:1px solid rgba(239,68,68,0.2)">
              <span style="font-size:.76rem;font-weight:700;color:var(--color-danger,#ef4444)">⚠ ${stats.marksAtRisk} marks currently at risk</span>
            </div>` : ''}
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:var(--text-muted);display:flex;align-items:center;flex-shrink:0">${TYPE_SVG[top.type] || ''}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.84rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${top.subject} · ${top.chapter}</div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;display:flex;gap:6px;align-items:center">
                <span>${TYPE_LABELS[top.type]}</span>
                ${top.board_marks > 0 ? `<span>·</span><span style="color:var(--color-warning,#f59e0b)">${top.board_marks}M</span>` : ''}
                <span>·</span><span style="color:${pc}">${formatAge(top.created_at)}</span>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" style="flex-shrink:0;font-size:.72rem" onclick="Backlog.markComplete('${top.id}')">Done</button>
          </div>
          ${more > 0 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:.72rem;color:var(--text-muted)">+${more} more item${more > 1 ? 's' : ''} pending</div>` : ''}
        </div>`;
    },

    // ── Render: Full Page ─────────────────────────────────────────────────────

    async renderPage() {
      const el = document.getElementById('page-backlog');
      if (!el) return;
      const userId = getUserId();
      if (!userId) { el.innerHTML = `<div class="empty-state"><div class="empty-state-title">Sign in to view your backlog</div></div>`; return; }
      el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:.85rem">Loading…</div>`;
      await this._loadItems(userId);

      // ── Second-chance sync: profile is guaranteed loaded by now ──
      this._syncRecoveryHoursFromSettings();

      const active = this._activeItems();
      updateNavBadge(active.length);

      if (active.length === 0) {
        el.innerHTML = `
          <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
            <button class="btn btn-primary btn-sm" onclick="Backlog.openAddModal()">+ Add Item</button>
          </div>
          <div class="empty-state">
            <div style="font-size:2.2rem;margin-bottom:14px">✅</div>
            <div class="empty-state-title">Backlog cleared</div>
            <div class="empty-state-desc" style="max-width:340px;margin:0 auto 8px;line-height:1.7">
              0 chapters at risk. This is where pending lectures, skipped revisions, and unattempted questions pile up.
            </div>
            <div style="font-size:.82rem;color:var(--color-success,#22c55e);font-weight:600;margin-bottom:20px">No study debt outstanding</div>
            <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
          </div>`;
        return;
      }

      const stats = this._stats();
      el.innerHTML = `
        ${this._renderHeader()}
        ${this._renderMarksAtRisk(stats)}
        ${this._renderStatsBar(stats)}
        ${this._renderRecoveryPlan()}
        ${this._renderTodaysFocus(active)}
        ${this._renderQuickWins(active)}
        ${this._renderSubjectFilter(active)}
        ${this._renderFullList(active)}
        <div style="text-align:center;font-size:.72rem;color:var(--text-muted);padding:20px 0 4px">
          ${active.length} item${active.length !== 1 ? 's' : ''} in backlog
        </div>`;
    },

    // ── Render Sections ───────────────────────────────────────────────────────

    _renderHeader() {
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div>
            <h2 style="margin:0;font-size:1rem;font-weight:700">Backlog</h2>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">Chapters you owe yourself</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Backlog.openAddModal()">+ Add Item</button>
        </div>`;
    },

    _renderMarksAtRisk(stats) {
      if (stats.marksAtRisk === 0) return '';
      return `
        <div style="margin-bottom:14px;padding:12px 16px;background:rgba(239,68,68,0.08);border-radius:10px;border:1px solid rgba(239,68,68,0.25)">
          <div style="font-size:.92rem;font-weight:700;color:var(--color-danger,#ef4444)">⚠ ${stats.marksAtRisk} marks currently at risk</div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:3px">
            across ${stats.total} pending chapter${stats.total !== 1 ? 's' : ''} — clear your backlog to recover these marks
          </div>
        </div>`;
    },

    _renderStatsBar(stats) {
      const daysToExam = App?.getDaysToExam?.() ?? null;
      const examCtx    = daysToExam !== null && daysToExam > 0 ? ` · ${daysToExam}d to exam` : '';
      return `
        <div style="display:flex;margin-bottom:14px;background:var(--color-surface-hover,rgba(255,255,255,0.04));border-radius:10px;border:1px solid var(--border);overflow:hidden">
          ${this._statCell(stats.total, 'Total',  'var(--text-primary)')}
          ${this._statCell(stats.high,  'High',   'var(--color-danger,#ef4444)')}
          ${this._statCell(stats.shaky, 'Shaky',  '#a78bfa')}
          <div style="flex:1;display:flex;align-items:center;justify-content:flex-end;padding:10px 14px;font-size:.68rem;color:var(--text-muted)">
            ~${stats.totalHours}h to clear${examCtx}
          </div>
        </div>`;
    },

    _renderRecoveryPlan() {
      const stats = this._stats();
      const h     = this.state.recoveryHours;
      const daysToExam = App?.getDaysToExam?.() ?? null;
      let examNote = '';
      if (daysToExam !== null && daysToExam > 0 && stats.shakyClearByDays !== null) {
        examNote = stats.shakyClearByDays < daysToExam
          ? `<span style="color:var(--color-success,#22c55e);font-weight:600">✓ ${daysToExam - stats.shakyClearByDays} days before boards</span>`
          : `<span style="color:var(--color-danger,#ef4444);font-weight:600">⚠ ${stats.shakyClearByDays - daysToExam}d after boards — increase hours</span>`;
      }
      return `
        <div id="bl-recovery-plan" style="margin-bottom:14px;padding:12px 16px;border:1px solid var(--border);border-radius:10px;background:var(--color-surface-hover,rgba(255,255,255,0.03))">
          <div style="font-size:.68rem;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Recovery Plan</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:.82rem;color:var(--text-secondary)">Study</span>
            <select id="bl-recovery-hours" class="form-input" style="padding:5px 8px;font-size:.82rem;width:auto;height:auto" onchange="Backlog.setRecoveryHours(this.value)">
              <option value="1"   ${h==1?'selected':''}>1h / day</option>
              <option value="1.5" ${h==1.5?'selected':''}>1.5h / day</option>
              <option value="2"   ${h==2?'selected':''}>2h / day</option>
              <option value="3"   ${h==3?'selected':''}>3h / day</option>
              <option value="4"   ${h==4?'selected':''}>4h / day</option>
            </select>
            ${stats.clearByDate
              ? `<span style="font-size:.82rem">→ cleared by <strong>${stats.clearByDate}</strong>${examNote ? ' · ' + examNote : ''}</span>`
              : ''}
          </div>
        </div>`;
    },

    _renderTodaysFocus(active) {
      const focus      = active.slice(0, 3);
      const focusMins  = focus.reduce((s, i) => s + (i.time_estimate_mins || 60), 0);
      const focusHrs   = focusMins >= 60 ? `${Math.floor(focusMins/60)}h${focusMins%60>0?' '+(focusMins%60)+'m':''}`.trim() : `${focusMins}m`;
      const focusMarks = focus.reduce((s, i) => s + (i.board_marks || 0), 0);
      return `
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div>
              <div style="font-size:.68rem;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase">Today's Focus</div>
              <div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">
                ${focus.length} chapters · ~${focusHrs}${focusMarks > 0 ? ` · ${focusMarks} marks covered` : ''}
              </div>
            </div>
            ${active.length > 3 ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="document.getElementById('bl-full-list')?.scrollIntoView({behavior:'smooth'})">View all ${active.length} →</button>` : ''}
          </div>
          ${focus.map((item, idx) => this._focusCard(item, idx + 1)).join('')}
        </div>`;
    },

    _focusCard(item, num) {
      const pc  = pColor(item.priority);
      const sc  = STATUS_COLORS[item.status] || 'var(--text-muted)';
      const mins = item.time_estimate_mins || 60;
      const timeStr = mins >= 60 ? `~${Math.floor(mins/60)}h${mins%60>0?' '+(mins%60)+'m':''}` : `~${mins}m`;
      return `
        <div class="card" style="margin-bottom:10px;border-left:3px solid ${pc}">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--color-surface-hover,rgba(255,255,255,0.06));display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:var(--text-muted);margin-top:1px">${num}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:.87rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.chapter}</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:4px">
                <span style="font-size:.7rem;color:var(--text-muted)">${item.subject}</span>
                <span style="font-size:.65rem;color:var(--text-muted)">·</span>
                <span style="font-size:.7rem;color:var(--text-muted)">${TYPE_LABELS[item.type]}</span>
                ${item.board_marks > 0 ? `<span style="font-size:.65rem;color:var(--text-muted)">·</span><span style="font-size:.7rem;color:var(--color-warning,#f59e0b);font-weight:600">${item.board_marks}M</span>` : ''}
                <span style="font-size:.65rem;color:var(--text-muted)">·</span>
                <span style="font-size:.7rem;color:var(--text-muted)">${timeStr}</span>
              </div>
              <div style="margin-top:6px">
                <span style="font-size:.66rem;padding:2px 7px;border-radius:4px;background:${sc}20;color:${sc};font-weight:600;border:1px solid ${sc}40">${STATUS_LABELS[item.status]}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:7px;margin-top:12px">
            ${this._statusAdvanceBtn(item)}
            <button class="btn btn-secondary btn-sm" onclick="Backlog.pushToToday('${item.id}')">To Tasks</button>
            <button class="btn btn-ghost btn-sm" onclick="Backlog.openDismissModal('${item.id}')">Dismiss</button>
          </div>
        </div>`;
    },

    _statusAdvanceBtn(item) {
      const cfg = {
        [STATUS.NOT_STARTED]: { label: 'Start',     cls: 'btn-secondary' },
        [STATUS.IN_PROGRESS]: { label: 'Mark Done', cls: 'btn-primary'   },
        [STATUS.DONE_SHAKY]:  { label: 'Re-rate',   cls: 'btn-primary'   },
      };
      const { label, cls } = cfg[item.status] || { label: 'Done', cls: 'btn-primary' };
      return `<button class="btn ${cls} btn-sm" style="flex:1" onclick="Backlog.advanceStatus('${item.id}')">${label}</button>`;
    },

    _renderQuickWins(active) {
      const wins = active.filter(i => (i.time_estimate_mins || 60) <= 35);
      if (!wins.length) return '';
      const totalMins = wins.reduce((s, i) => s + (i.time_estimate_mins || 35), 0);
      return `
        <div style="margin-bottom:16px">
          <div style="font-size:.68rem;font-weight:700;letter-spacing:.08em;color:var(--color-success,#22c55e);text-transform:uppercase;margin-bottom:6px">Quick Wins · Under 30 min each</div>
          <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:10px">${wins.length} item${wins.length!==1?'s':''} · ~${totalMins}m total — build momentum here</div>
          ${wins.slice(0, 3).map(item => {
            const pc   = pColor(item.priority);
            const mins = item.time_estimate_mins || 35;
            return `
              <div class="card" style="margin-bottom:8px;border-left:3px solid var(--color-success,#22c55e);display:flex;align-items:center;gap:10px;padding:10px 14px">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.83rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.chapter}</div>
                  <div style="font-size:.7rem;color:var(--text-muted);margin-top:3px;display:flex;gap:5px;align-items:center">
                    <span>${item.subject}</span><span>·</span>
                    <span style="color:var(--color-success,#22c55e);font-weight:600">~${mins}m</span>
                    ${item.board_marks > 0 ? `<span>·</span><span style="color:var(--color-warning,#f59e0b)">${item.board_marks}M</span>` : ''}
                  </div>
                </div>
                ${this._statusAdvanceBtn(item)}
              </div>`;
          }).join('')}
        </div>`;
    },

    _renderSubjectFilter(active) {
      const subjects      = [...new Set(active.map(i => i.subject))];
      if (subjects.length <= 1) return '';
      const currentFilter = this.state.filter || 'all';
      return `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          <button class="btn btn-sm ${currentFilter==='all'?'btn-primary':'btn-ghost'}" onclick="Backlog._setFilter('all')">All ${active.length}</button>
          ${subjects.map(s => {
            const cnt  = active.filter(i => i.subject === s).length;
            const safe = s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            return `<button class="btn btn-sm ${currentFilter===s?'btn-primary':'btn-ghost'}" onclick="Backlog._setFilter('${safe}')">${s} ${cnt}</button>`;
          }).join('')}
        </div>`;
    },

    _renderFullList(active) {
      const currentFilter = this.state.filter || 'all';
      const filtered      = currentFilter === 'all' ? active : active.filter(i => i.subject === currentFilter);
      if (!filtered.length) return `
        <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:.85rem">
          No items for this filter.
          <br><button class="btn btn-ghost btn-sm" onclick="Backlog._setFilter('all')" style="margin-top:10px">Clear filter</button>
        </div>`;

      // Skip top 3 already shown in Today's Focus when viewing all
      const skipSet   = currentFilter === 'all' ? new Set(active.slice(0, 3).map(i => i.id)) : new Set();
      const remaining = filtered.filter(i => !skipSet.has(i.id));
      if (!remaining.length) return '';

      const high   = remaining.filter(i => i.priority === 'high');
      const medium = remaining.filter(i => i.priority === 'medium');
      const low    = remaining.filter(i => i.priority === 'low');

      const renderGroup = (label, color, group) => {
        if (!group.length) return '';
        return `
          <div style="font-size:.68rem;font-weight:700;letter-spacing:.1em;color:${color};text-transform:uppercase;margin:14px 0 8px">${label} · ${group.length}</div>
          ${group.map(i => this._itemCard(i)).join('')}`;
      };

      return `
        <div id="bl-full-list">
          <div style="font-size:.68rem;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">
            All Items${currentFilter !== 'all' ? ` — ${currentFilter}` : ''}
          </div>
          ${renderGroup('High Priority',   'var(--color-danger,#ef4444)',  high)}
          ${renderGroup('Medium Priority', 'var(--color-warning,#f59e0b)', medium)}
          ${renderGroup('Low Priority',    'var(--text-muted)',            low)}
        </div>`;
    },

    _itemCard(item) {
      const pc    = pColor(item.priority);
      const sc    = STATUS_COLORS[item.status] || 'var(--text-muted)';
      const until = daysUntil(item.due_date);
      const mins  = item.time_estimate_mins || 60;
      const timeStr = mins >= 60 ? `~${Math.floor(mins/60)}h${mins%60>0?' '+(mins%60)+'m':''}` : `~${mins}m`;
      const dueBadge = item.due_date ? `<span style="font-size:.68rem;color:${until!==null&&until<=2?'var(--color-danger,#ef4444)':'var(--text-muted)'}">Due ${until!==null?(until>0?`in ${until}d`:until===0?'today':'overdue'):''}</span>` : '';
      return `
        <div class="card bl-item-card" style="border-left:3px solid ${pc};margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="color:var(--text-muted);flex-shrink:0;margin-top:1px">${TYPE_SVG[item.type]||''}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.subject} · ${item.chapter}</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:4px">
                <span style="font-size:.7rem;color:var(--text-muted)">${TYPE_LABELS[item.type]}</span>
                ${item.board_marks > 0 ? `<span style="font-size:.65rem;color:var(--text-muted)">·</span><span style="font-size:.7rem;color:var(--color-warning,#f59e0b);font-weight:600">${item.board_marks}M boards</span>` : ''}
                <span style="font-size:.65rem;color:var(--text-muted)">·</span>
                <span style="font-size:.7rem;color:var(--text-muted)">${timeStr}</span>
                <span style="font-size:.65rem;color:var(--text-muted)">·</span>
                <span style="font-size:.7rem;color:${pc}">${formatAge(item.created_at)}</span>
                ${dueBadge}
              </div>
              <div style="margin-top:6px">
                <span style="font-size:.66rem;padding:2px 7px;border-radius:4px;background:${sc}20;color:${sc};font-weight:600;border:1px solid ${sc}40">${STATUS_LABELS[item.status]}</span>
              </div>
              ${item.topic ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:3px">Topic: ${item.topic}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:7px;margin-top:12px">
            ${this._statusAdvanceBtn(item)}
            <button class="btn btn-secondary btn-sm" onclick="Backlog.pushToToday('${item.id}')">Tasks</button>
            <button class="btn btn-ghost btn-sm" onclick="Backlog.openDismissModal('${item.id}')">Dismiss</button>
          </div>
        </div>`;
    },

    // ── Helpers ───────────────────────────────────────────────────────────────

    _statCell(value, label, color) {
      return `<div style="display:flex;flex-direction:column;align-items:center;padding:10px 14px;min-width:56px;border-right:1px solid var(--border)"><span style="font-size:1.05rem;font-weight:700;color:${color}">${value}</span><span style="font-size:.62rem;color:var(--text-muted);margin-top:1px">${label}</span></div>`;
    },

    _setFilter(subject) {
      this.state.filter = subject;
      if (App?.state?.currentPage === 'backlog') this.renderPage();
    },

    _afterChange() {
      updateNavBadge(this._activeItems().length);
      this._refreshDashboardWidget();
    },

    _refreshDashboardWidget() {
      const el = document.getElementById('backlog-dashboard-widget');
      if (el) el.innerHTML = this.renderDashboardWidget();
    },

    _undoFn: null, _undoTimer: null,

    _showUndo(label, fn) {
      document.getElementById('bl-undo-bar')?.remove();
      clearTimeout(this._undoTimer);
      this._undoFn = fn;
      const bar = document.createElement('div');
      bar.id = 'bl-undo-bar';
      bar.innerHTML = `<span>${label}</span><button onclick="Backlog._undo()" style="background:none;border:none;cursor:pointer;color:var(--accent-light,#818cf8);font-weight:700;font-size:.82rem;padding:0;margin-left:12px">Undo</button>`;
      Object.assign(bar.style, { position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', background:'var(--color-surface,#1e1e2e)', border:'1px solid var(--border)', borderRadius:'8px', padding:'10px 16px', display:'flex', alignItems:'center', fontSize:'.82rem', zIndex:'9999', boxShadow:'0 4px 20px rgba(0,0,0,0.25)', whiteSpace:'nowrap', animation:'blFadeUp .2s ease' });
      document.body.appendChild(bar);
      this._undoTimer = setTimeout(() => { bar.remove(); this._undoFn = null; }, 5000);
    },

    async _undo() {
      document.getElementById('bl-undo-bar')?.remove();
      clearTimeout(this._undoTimer);
      if (this._undoFn) { await this._undoFn(); this._undoFn = null; }
    },
  };

  function _tryInit() {
    const userId = window._supabaseUserId;
    if (userId) { Backlog.init(userId); return; }
    setTimeout(_tryInit, 200);
  }
  _tryInit();

  window.Backlog = Backlog;

})();