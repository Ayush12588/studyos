/**
 * backlog.js — StudyOS Study Debt Tracker v2
 *
 * What changed from v1:
 *   1. EXAM-AWARE PRIORITY   — replaces arbitrary "age >= 7 days = high" with
 *                              urgency that scales against actual exam proximity
 *   2. POST-SESSION HOOK     — onSessionLogged() cross-refs logged chapters
 *                              against backlog and prompts to mark done; called
 *                              by one new line in App.saveStudyLog()
 *   3. "DO THIS TODAY" CARD  — single pinned recommendation at top of page;
 *                              eliminates decision paralysis for overwhelmed students
 *   4. STATS BAR             — total / high / medium / estimated hours to clear / days to exam
 *   5. PUSH TO TODAY         — adds item as a Daily Task (integrates with App.state.tasks)
 *   6. FLEXIBLE SNOOZE       — 1d / 3d / 7d / After Exam (was hardcoded 3d)
 *   7. SUBJECT FILTER BAR    — filter by subject when multiple subjects in backlog
 *   8. BETTER EMPTY STATE    — teaches users what the backlog is for; not just a dead end
 *   9. MEANINGFUL COMPLETION — better toast copy when items are cleared
 *
 * Requires: db.js (window.DB, window.supabase), app.js (App)
 * Exposes:  window.Backlog
 *
 * app.js change needed (one line in saveStudyLog, after closeModal call):
 *   if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
 *
 * app.html change needed: replace the "Remind me in 3 days" radio with the
 *   updated snooze block defined at the bottom of this file.
 */

(function () {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────────────────

  const TYPE_LABELS = {
    lecture_pending:   'Lecture Pending',
    revision_pending:  'Revision Pending',
    questions_pending: 'Questions Pending',
    chapter_unstarted: 'Chapter Not Started',
  };

  const TYPE_SVG = {
    lecture_pending:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    revision_pending:  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>`,
    questions_pending: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    chapter_unstarted: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function daysSince(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  /**
   * Exam-aware priority — the old system was "age >= 7 days = high" which
   * is meaningless without exam context. A chapter pending for 8 days when
   * the exam is 90 days away is low priority. The same chapter pending for
   * 3 days when the exam is in 2 weeks is a fire.
   *
   * Priority ladder (first match wins):
   *   - Explicit due date within 2 days            → high
   *   - Exam ≤ 14 days away                        → high (everything is urgent)
   *   - Exam ≤ 30 days + item sitting 3+ days      → high
   *   - Exam ≤ 60 days + item sitting 10+ days     → high
   *   - Exam ≤ 30 days + item freshly added        → medium
   *   - Exam ≤ 60 days + item sitting 3+ days      → medium
   *   - No exam date — age ≥ 14 days               → high (safe fallback)
   *   - No exam date — age ≥ 5 days                → medium
   *   - Everything else                            → low
   */
  function computePriority(createdAt, dueDate) {
    const age        = daysSince(createdAt);
    const until      = daysUntil(dueDate);
    const daysToExam = App?.getDaysToExam?.() ?? null;

    if (until !== null && until <= 2) return 'high';

    if (daysToExam !== null && daysToExam >= 0) {
      if (daysToExam <= 14)                  return 'high';
      if (daysToExam <= 30 && age >= 3)      return 'high';
      if (daysToExam <= 60 && age >= 10)     return 'high';
      if (daysToExam <= 30)                  return 'medium';
      if (daysToExam <= 60 && age >= 3)      return 'medium';
      return 'low';
    }

    // No exam date set — fall back to age-based
    if (age >= 14) return 'high';
    if (age >= 5)  return 'medium';
    return 'low';
  }

  function priorityOrder(p) {
    return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
  }

  function formatAge(dateStr) {
    const d = daysSince(dateStr);
    if (d === 0) return 'Added today';
    if (d === 1) return '1 day old';
    return `${d} days old`;
  }

  function pColor(p) {
    if (p === 'high')   return 'var(--color-danger,#ef4444)';
    if (p === 'medium') return 'var(--color-warning,#f59e0b)';
    return 'var(--text-muted)';
  }

  function toast(msg, type) {
    if (App && App.toast) App.toast(msg, type || 'info');
  }

  function getUserId() {
    return window._supabaseUserId || null;
  }

  function updateNavBadge(count) {
    const badge = document.getElementById('backlog-nav-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // ─── Main Object ───────────────────────────────────────────────────────────

  const Backlog = {
    state: {
      items:   [],
      loading: false,
      filter:  'all', // 'all' | subject name string
      search:  '',
    },

    // ── Bootstrap ──────────────────────────────────────────────────────────────

    async init(userId) {
      if (!userId) return;
      await this._loadItems(userId);
      this._refreshDashboardWidget();
      updateNavBadge(this.state.items.length);
    },

    // ── Data ───────────────────────────────────────────────────────────────────

    async _loadItems(userId) {
      this.state.loading = true;
      const { data, error } = await DB.backlog.getActive(userId);
      this.state.loading = false;
      if (error) { console.error('[Backlog] load error:', error); return; }

      const items = (data || []).map(item => {
        const fresh = computePriority(item.created_at, item.due_date);
        // Silently sync priority if it drifted (exam date may have changed)
        if (fresh !== item.priority) {
          window.supabase.from('backlog_items')
            .update({ priority: fresh }).eq('id', item.id).then(() => {});
        }
        return { ...item, priority: fresh };
      });

      items.sort((a, b) => {
        const pd = priorityOrder(a.priority) - priorityOrder(b.priority);
        return pd !== 0 ? pd : new Date(a.created_at) - new Date(b.created_at);
      });

      this.state.items = items;
    },

    // ── Actions ────────────────────────────────────────────────────────────────

    async addItem(userId, { subject, chapter, topic, type, dueDate, source }) {
      if (!subject || !chapter || !type) {
        toast('Subject, chapter, and type are required', 'warning');
        return false;
      }

      const isDupe = await DB.backlog.hasDuplicate(userId, subject, chapter, type);
      if (isDupe) {
        toast(`${TYPE_LABELS[type]} for "${chapter}" already in backlog`, 'warning');
        return false;
      }

      const priority = computePriority(new Date().toISOString(), dueDate);

      const { data, error } = await DB.backlog.create({
        user_id:  userId,
        subject,
        chapter,
        topic:    topic || null,
        type,
        source:   source || 'manual',
        priority,
        due_date: dueDate || null,
        status:   'pending',
      });

      if (error) {
        if (error.code === '23505') { toast('Already in backlog', 'warning'); return false; }
        console.error('[Backlog] create error:', error);
        toast('Failed to add item', 'error');
        return false;
      }

      this.state.items.unshift({ ...data, priority });
      this._sort();
      this._afterChange();
      toast(`Added: ${chapter}`, 'success');
      return true;
    },

    async markComplete(itemId) {
      const { error } = await DB.backlog.complete(itemId);
      if (error) { toast('Could not complete item', 'error'); return; }

      this.state.items = this.state.items.filter(i => i.id !== itemId);
      this._afterChange();
      if (App && App.addXP) App.addXP(10, 'Backlog item cleared');

      // Make the win feel real, not just a one-word toast
      const remaining = this.state.items.length;
      const msg = remaining === 0
        ? '🎉 Backlog cleared! You\'re fully caught up!'
        : remaining === 1
          ? '✅ Done! One item left in your backlog'
          : `✅ Done! ${remaining} items remaining`;
      toast(msg, 'success');

      if (App && App.state.currentPage === 'backlog') this.renderPage();
    },

    openDismissModal(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item) return;
      document.getElementById('bl-dismiss-name').textContent =
        `${item.subject} · ${item.chapter}`;
      document.getElementById('modal-backlog-dismiss').dataset.itemId = itemId;
      document.querySelectorAll('input[name="bl-dismiss-reason"]')
        .forEach(r => r.checked = false);
      // Hide snooze options until user picks "postpone"
      const snoozeRow = document.getElementById('bl-snooze-days-row');
      if (snoozeRow) snoozeRow.style.display = 'none';
      App.openModal('modal-backlog-dismiss');
    },

    // Called by the "Remind me later" radio onchange
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
        const snoozeDaysVal = parseInt(
          document.getElementById('bl-snooze-days')?.value || '3'
        );
        const daysToExam = App?.getDaysToExam?.() ?? null;

        // -1 = "After exam" sentinel; fall back to 7 if no exam date is set
        const actualDays = snoozeDaysVal === -1
          ? (daysToExam !== null && daysToExam > 0 ? daysToExam : 7)
          : snoozeDaysVal;

        const d = new Date();
        d.setDate(d.getDate() + actualDays);
        snoozeUntil = d.toISOString().split('T')[0];
      }

      const { error } = await DB.backlog.dismiss(itemId, reason, snoozeUntil);
      if (error) { toast('Could not dismiss', 'error'); return; }

      App.closeModal('modal-backlog-dismiss');

      const dismissed = this.state.items.find(i => i.id === itemId);
      this.state.items = this.state.items.filter(i => i.id !== itemId);
      this._afterChange();
      if (App && App.state.currentPage === 'backlog') this.renderPage();

      const snoozeLabel = snooze ? `Snoozed until ${snoozeUntil}` : 'Dismissed';
      this._showUndo(snoozeLabel, async () => {
        const { error: e } = await DB.backlog.restore(itemId);
        if (e) { toast('Could not restore', 'error'); return; }
        this.state.items.unshift(dismissed);
        this._sort();
        this._afterChange();
        if (App && App.state.currentPage === 'backlog') this.renderPage();
        toast('Restored', 'info');
      });
    },

    async autoAddFromRevision(userId, subject, chapter) {
      await this.addItem(userId, {
        subject, chapter,
        type:   'revision_pending',
        source: 'auto_revision',
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // POST-SESSION HOOK
    // Called from App.saveStudyLog() after a session is saved:
    //   if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
    //
    // Cross-references the chapter just logged against backlog items and shows
    // a floating prompt asking the student to close the debt. Zero extra steps.
    // ─────────────────────────────────────────────────────────────────────────

    onSessionLogged(subjectName, chapterName) {
      if (!chapterName || !subjectName) return;
      const match = this.state.items.find(i =>
        i.subject.toLowerCase() === subjectName.toLowerCase() &&
        i.chapter.toLowerCase() === chapterName.toLowerCase()
      );
      if (!match) return;
      this._showBacklogClearPrompt(match);
    },

    _showBacklogClearPrompt(item) {
      // Remove any existing prompt so there's never more than one
      document.getElementById('bl-session-prompt')?.remove();

      const el  = document.createElement('div');
      el.id     = 'bl-session-prompt';
      const pc  = pColor(item.priority);

      el.innerHTML = `
        <button onclick="document.getElementById('bl-session-prompt')?.remove()"
          style="position:absolute;top:8px;right:10px;background:none;border:none;
                 cursor:pointer;font-size:1rem;color:var(--text-muted);line-height:1">×</button>
        <div style="font-size:.8rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;padding-right:16px">
          📋 "${item.chapter}" is in your backlog
        </div>
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:10px">
          You just studied this. Ready to close the debt?
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="Backlog._clearFromSessionPrompt('${item.id}')"
            style="flex:1;padding:7px 0;background:var(--accent,#6366f1);color:#fff;
                   border:none;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600">
            ✓ Mark Done
          </button>
          <button onclick="document.getElementById('bl-session-prompt')?.remove()"
            style="flex:1;padding:7px 0;background:transparent;color:var(--text-muted);
                   border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:.78rem">
            Not yet
          </button>
        </div>`;

      Object.assign(el.style, {
        position:     'fixed',
        bottom:       '90px',
        right:        '20px',
        background:   'var(--color-surface,#1e1e2e)',
        border:       `1px solid ${pc}`,
        borderRadius: '12px',
        padding:      '14px 16px',
        zIndex:       '9999',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.35)',
        width:        '260px',
        animation:    'blFadeUp .25s ease',
      });
      document.body.appendChild(el);
      // Auto-dismiss after 12s so it doesn't hang around forever
      setTimeout(() => document.getElementById('bl-session-prompt')?.remove(), 12000);
    },

    async _clearFromSessionPrompt(itemId) {
      document.getElementById('bl-session-prompt')?.remove();
      await this.markComplete(itemId);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PUSH TO TODAY
    // Adds a backlog item as a Daily Task so it shows up in the student's
    // task list without them having to manually copy it over.
    // ─────────────────────────────────────────────────────────────────────────

    async pushToToday(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item || !App) return;

      const today    = App.today?.() || new Date().toISOString().split('T')[0];
      const taskText = `📋 [Backlog] ${TYPE_LABELS[item.type] || item.type}: ${item.subject} · ${item.chapter}`;

      // Prevent duplicates in today's task list
      const alreadyExists = (App.state.tasks || []).some(
        t => t.text === taskText && t.date === today
      );
      if (alreadyExists) { toast('Already in today\'s tasks', 'info'); return; }

      const newTask = {
        id:        App.uid?.() || Date.now().toString(36),
        text:      taskText,
        done:      false,
        date:      today,
        createdAt: Date.now(),
      };
      App.state.tasks.push(newTask);

      const userId = getUserId();
      if (userId) {
        DB.tasks.create({ user_id: userId, text: taskText, done: false, date: today })
          .then(({ data, error }) => {
            if (error) { console.error('[Backlog] pushToToday:', error); return; }
            if (data && data.id) newTask.id = data.id;
          });
      }

      App.save?.();
      toast('Added to today\'s tasks!', 'success');
    },

    // ── Add Modal ──────────────────────────────────────────────────────────────

    async openAddModal() {
      if (!App?.state?.subjects?.length) {
        await App?._loadTabData('subjects');
      }

      const subjects   = App?.state?.subjects || [];
      const subjectSel = document.getElementById('bl-subject');

      subjectSel.innerHTML = subjects.length === 0
        ? `<option value="">No subjects found — add subjects first</option>`
        : '<option value="">Select subject…</option>' +
          subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

      subjectSel.onchange = () => {
        const name       = subjectSel.value;
        const chapterSel = document.getElementById('bl-chapter');
        if (!name) {
          chapterSel.innerHTML = `<option value="">Select subject first…</option>`;
          return;
        }
        const subj     = (App?.state?.subjects || []).find(s => s.name === name);
        const chapters = subj?.chapters || [];
        chapterSel.innerHTML =
          `<option value="">Select chapter…</option>` +
          chapters.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
      };

      document.getElementById('bl-chapter').innerHTML = `<option value="">Select subject first…</option>`;
      document.getElementById('bl-topic').value = '';
      document.getElementById('bl-due').value   = '';
      document.querySelectorAll('input[name="bl-type"]').forEach(r => r.checked = false);

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

      if (!subject || !chapter || !typeEl) {
        toast('Fill in subject, chapter, and type', 'warning');
        return;
      }

      const btn = document.getElementById('bl-add-btn');
      btn.disabled    = true;
      btn.textContent = 'Adding…';

      const ok = await this.addItem(userId, {
        subject, chapter, topic,
        type: typeEl.value, dueDate,
      });

      btn.disabled    = false;
      btn.textContent = 'Add to Backlog';

      if (ok) {
        App.closeModal('modal-backlog-add');
        if (App.state.currentPage === 'backlog') this.renderPage();
      }
    },

    // ── Render: Dashboard Widget ───────────────────────────────────────────────

    renderDashboardWidget() {
      const items = this.state.items;
      if (!items.length) return '';

      const top   = items[0];
      const count = items.length;
      const more  = count - 1;
      const pc    = pColor(top.priority);

      return `<div class="card bl-widget" style="border-left:3px solid ${pc};margin-bottom:12px">
        <div class="card-header" style="margin-bottom:10px">
          <span class="card-title" style="display:flex;align-items:center;gap:6px">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="${pc}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Study Debt
          </span>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('backlog')" style="font-size:.72rem">
            View all (${count}) →
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="color:var(--text-muted);display:flex;align-items:center;flex-shrink:0">
            ${TYPE_SVG[top.type] || ''}
          </span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.84rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${top.subject} · ${top.chapter}
            </div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">
              ${TYPE_LABELS[top.type]} &nbsp;·&nbsp;
              <span style="color:${pc}">${formatAge(top.created_at)}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" style="flex-shrink:0;font-size:.72rem"
            onclick="Backlog.markComplete('${top.id}')">
            Mark Done
          </button>
        </div>
        ${more > 0 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:.72rem;color:var(--text-muted)">
          +${more} more item${more > 1 ? 's' : ''} pending
        </div>` : ''}
      </div>`;
    },

    // ── Render: Full Backlog Page ──────────────────────────────────────────────

    async renderPage() {
      const el = document.getElementById('page-backlog');
      if (!el) return;

      const userId = getUserId();
      if (!userId) {
        el.innerHTML = `<div class="empty-state">
          <div class="empty-state-title">Sign in to view your backlog</div>
        </div>`;
        return;
      }

      el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:.85rem">Loading…</div>`;

      await this._loadItems(userId);
      updateNavBadge(this.state.items.length);

      const items = this.state.items;

      // ── Empty State ────────────────────────────────────────────────────────
      if (items.length === 0) {
        el.innerHTML = `
          <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
            <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
          </div>
          <div class="empty-state">
            <div style="font-size:2.5rem;margin-bottom:14px">✅</div>
            <div class="empty-state-title">All caught up!</div>
            <div class="empty-state-desc" style="max-width:340px;margin:0 auto 20px;line-height:1.7">
              No pending study debt. This page tracks chapters piling up —
              lectures you skipped, revisions you postponed, questions you
              never attempted.
            </div>
            <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Something</button>
            <div class="empty-state-hint" style="margin-top:14px;font-size:.72rem">
              💡 After studying a chapter that's in your backlog, you'll get a prompt to mark it done.
            </div>
          </div>`;
        return;
      }

      // ── Stats Bar ──────────────────────────────────────────────────────────
      const high        = items.filter(i => i.priority === 'high');
      const medium      = items.filter(i => i.priority === 'medium');
      const low         = items.filter(i => i.priority === 'low');
      const daysToExam  = App?.getDaysToExam?.() ?? null;
      // Rough estimate: each backlog item ≈ 1.5h to properly clear
      const estHours    = Math.round(items.length * 1.5);
      const examContext = daysToExam !== null && daysToExam > 0
        ? `&nbsp;·&nbsp;${daysToExam}d to exam`
        : '';

      const statsBar = `
        <div style="display:flex;gap:0;margin-bottom:14px;
          background:var(--color-surface-hover,rgba(255,255,255,0.04));
          border-radius:10px;border:1px solid var(--border);overflow:hidden">
          ${this._statCell(items.length, 'Total',  'var(--text-primary)')}
          ${this._statCell(high.length,   'High',   'var(--color-danger,#ef4444)')}
          ${this._statCell(medium.length, 'Medium', 'var(--color-warning,#f59e0b)')}
          <div style="flex:1;display:flex;align-items:center;justify-content:flex-end;
            padding:10px 14px;font-size:.68rem;color:var(--text-muted)">
            ~${estHours}h to clear${examContext}
          </div>
        </div>`;

      // ── "Do This Today" Pinned Card ────────────────────────────────────────
      // Single, unambiguous recommendation. Eliminates the "where do I start?" paralysis.
      const top    = items[0]; // already sorted high → medium → low, then oldest first
      const topPc  = pColor(top.priority);
      const topDue = daysUntil(top.due_date);

      const doThisToday = `
        <div class="card" style="border-left:3px solid ${topPc};margin-bottom:16px">
          <div style="font-size:.62rem;font-weight:700;letter-spacing:.09em;
            color:${topPc};margin-bottom:8px;text-transform:uppercase">
            ▶ Do This Today
          </div>
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="color:var(--text-muted);display:flex;align-items:center;
              flex-shrink:0;margin-top:1px">
              ${TYPE_SVG[top.type] || ''}
            </span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.92rem;font-weight:700;overflow:hidden;
                text-overflow:ellipsis;white-space:nowrap">
                ${top.chapter}
              </div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:3px;
                display:flex;flex-wrap:wrap;gap:4px;align-items:center">
                <span>${top.subject}</span>
                <span>·</span>
                <span>${TYPE_LABELS[top.type]}</span>
                <span>·</span>
                <span style="color:${topPc}">${formatAge(top.created_at)}</span>
                ${topDue !== null ? `<span>·</span><span style="color:${topDue <= 2 ? 'var(--color-danger,#ef4444)' : 'var(--text-muted)'}">due ${topDue > 0 ? `in ${topDue}d` : topDue === 0 ? 'today' : 'overdue'}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary" style="flex:1"
              onclick="Backlog.markComplete('${top.id}')">✓ Mark Done</button>
            <button class="btn btn-secondary btn-sm"
              onclick="Backlog.pushToToday('${top.id}')" title="Add to Daily Tasks">
              📋 Tasks
            </button>
            <button class="btn btn-ghost btn-sm"
              onclick="Backlog.openDismissModal('${top.id}')">Dismiss</button>
          </div>
        </div>`;

      // ── Subject Filter Bar ─────────────────────────────────────────────────
      // Only show if there are items from more than one subject
      const subjects      = [...new Set(items.map(i => i.subject))];
      const currentFilter = this.state.filter || 'all';
      const filterBar     = subjects.length > 1 ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          <button class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}"
            onclick="Backlog._setFilter('all')">All ${items.length}</button>
          ${subjects.map(s => {
            const cnt = items.filter(i => i.subject === s).length;
            const safe = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `<button class="btn btn-sm ${currentFilter === s ? 'btn-primary' : 'btn-ghost'}"
              onclick="Backlog._setFilter('${safe}')">${s} ${cnt}</button>`;
          }).join('')}
        </div>` : '';

      // ── Filter + Search Application ────────────────────────────────────────
      const filtered = currentFilter === 'all'
        ? items
        : items.filter(i => i.subject === currentFilter);

      const searchQuery = (this.state.search || '').toLowerCase().trim();
      const displayed   = searchQuery
        ? filtered.filter(i =>
            i.subject.toLowerCase().includes(searchQuery) ||
            i.chapter.toLowerCase().includes(searchQuery) ||
            (i.topic || '').toLowerCase().includes(searchQuery))
        : filtered;

      const noResults = displayed.length === 0
        ? `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:.85rem">
            No items match your filter.
            <br>
            <button class="btn btn-ghost btn-sm" onclick="Backlog._setFilter('all')"
              style="margin-top:10px">Clear filter</button>
           </div>`
        : '';

      // Re-split by priority for display (respecting filter)
      const dHigh   = displayed.filter(i => i.priority === 'high');
      const dMedium = displayed.filter(i => i.priority === 'medium');
      const dLow    = displayed.filter(i => i.priority === 'low');

      const renderGroup = (label, color, group) => {
        if (!group.length) return '';
        // Skip the top item from the first group — it's already shown in "Do This Today"
        const isFirstGroup  = label.startsWith('HIGH') && currentFilter === 'all' && !searchQuery;
        const renderItems   = isFirstGroup ? group.slice(1) : group;
        if (!renderItems.length) return '';
        return `
          <div class="bl-group-label" style="color:${color}">${label} · ${renderItems.length}</div>
          ${renderItems.map(i => this._itemCard(i)).join('')}`;
      };

      el.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
          <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
        </div>
        ${statsBar}
        ${doThisToday}
        ${filterBar}
        ${noResults}
        ${renderGroup('HIGH PRIORITY',   'var(--color-danger,#ef4444)',  dHigh)}
        ${renderGroup('MEDIUM PRIORITY', 'var(--color-warning,#f59e0b)', dMedium)}
        ${renderGroup('LOW PRIORITY',    'var(--text-muted)',            dLow)}
        <div style="text-align:center;font-size:.72rem;color:var(--text-muted);padding:20px 0">
          ${items.length} pending item${items.length !== 1 ? 's' : ''}
          ${displayed.length !== items.length ? ` · showing ${displayed.length}` : ''}
        </div>`;
    },

    // ── Private: stat cell helper ──────────────────────────────────────────────
    _statCell(value, label, color) {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;
          padding:10px 14px;min-width:56px;border-right:1px solid var(--border)">
          <span style="font-size:1.05rem;font-weight:700;color:${color}">${value}</span>
          <span style="font-size:.62rem;color:var(--text-muted);margin-top:1px">${label}</span>
        </div>`;
    },

    _setFilter(subject) {
      this.state.filter = subject;
      if (App && App.state.currentPage === 'backlog') this.renderPage();
    },

    _itemCard(item) {
      const pc       = pColor(item.priority);
      const until    = daysUntil(item.due_date);
      const dueBadge = item.due_date
        ? `<span class="bl-due-badge"
             style="color:${until !== null && until <= 2 ? 'var(--color-danger,#ef4444)' : 'var(--text-muted)'}">
             Due ${until !== null
               ? (until > 0 ? `in ${until}d` : until === 0 ? 'today' : 'overdue')
               : ''}
           </span>`
        : '';

      return `<div class="card bl-item-card" style="border-left:3px solid ${pc};margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span class="bl-type-icon" style="color:var(--text-muted)">
            ${TYPE_SVG[item.type] || ''}
          </span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${item.subject} · ${item.chapter}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px">
              <span style="font-size:.72rem;color:var(--text-muted)">${TYPE_LABELS[item.type]}</span>
              <span style="font-size:.65rem;color:var(--text-muted)">·</span>
              <span style="font-size:.72rem;color:${pc}">${formatAge(item.created_at)}</span>
              ${dueBadge}
            </div>
            ${item.topic
              ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:3px">Topic: ${item.topic}</div>`
              : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary btn-sm" style="flex:1"
            onclick="Backlog.markComplete('${item.id}')">✓ Done</button>
          <button class="btn btn-secondary btn-sm"
            onclick="Backlog.pushToToday('${item.id}')"
            title="Add to today's tasks" style="padding:0 10px">📋</button>
          <button class="btn btn-ghost btn-sm"
            onclick="Backlog.openDismissModal('${item.id}')">Dismiss</button>
        </div>
      </div>`;
    },

    // ── Internals ──────────────────────────────────────────────────────────────

    _sort() {
      this.state.items.sort((a, b) => {
        const pd = priorityOrder(a.priority) - priorityOrder(b.priority);
        return pd !== 0 ? pd : new Date(a.created_at) - new Date(b.created_at);
      });
    },

    _afterChange() {
      updateNavBadge(this.state.items.length);
      this._refreshDashboardWidget();
    },

    _refreshDashboardWidget() {
      const el = document.getElementById('backlog-dashboard-widget');
      if (el) el.innerHTML = this.renderDashboardWidget();
    },

    _undoFn:    null,
    _undoTimer: null,

    _showUndo(label, fn) {
      document.getElementById('bl-undo-bar')?.remove();
      clearTimeout(this._undoTimer);
      this._undoFn = fn;

      const bar = document.createElement('div');
      bar.id = 'bl-undo-bar';
      bar.innerHTML = `<span>${label}</span>
        <button onclick="Backlog._undo()"
          style="background:none;border:none;cursor:pointer;
                 color:var(--accent-light,#818cf8);font-weight:700;
                 font-size:.82rem;padding:0;margin-left:12px">
          Undo
        </button>`;
      Object.assign(bar.style, {
        position:     'fixed',
        bottom:       '80px',
        left:         '50%',
        transform:    'translateX(-50%)',
        background:   'var(--color-surface,#1e1e2e)',
        border:       '1px solid var(--border)',
        borderRadius: '8px',
        padding:      '10px 16px',
        display:      'flex',
        alignItems:   'center',
        fontSize:     '.82rem',
        zIndex:       '9999',
        boxShadow:    '0 4px 20px rgba(0,0,0,0.25)',
        whiteSpace:   'nowrap',
        animation:    'blFadeUp .2s ease',
      });
      document.body.appendChild(bar);
      this._undoTimer = setTimeout(() => { bar.remove(); this._undoFn = null; }, 5000);
    },

    async _undo() {
      document.getElementById('bl-undo-bar')?.remove();
      clearTimeout(this._undoTimer);
      if (this._undoFn) { await this._undoFn(); this._undoFn = null; }
    },
  };

  // ── Init: poll until App sets window._supabaseUserId ────────────────────────

  function _tryInit() {
    const userId = window._supabaseUserId;
    if (userId) { Backlog.init(userId); return; }
    setTimeout(_tryInit, 200);
  }
  _tryInit();

  window.Backlog = Backlog;

})();

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED CHANGES IN OTHER FILES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. app.js — ONE LINE in saveStudyLog(), after this.closeModal('modal-log'):
 *
 *    // After: this.save(); this.closeModal('modal-log'); this.render(); this.toast(...)
 *    if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
 *
 *    The full line context in saveStudyLog (around line 2023) should look like:
 *    this.save(); this.closeModal('modal-log'); this.render();
 *    this.toast(`📖 ${this.formatMin(time)} logged!`, 'success');
 *    this.dismissStreakReminder(false);
 *    if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
 *
 * 2. app.html — REPLACE the "Remind me in 3 days" radio block in modal-backlog-dismiss
 *    with this updated snooze block:
 *
 *    <label class="bl-radio-label">
 *      <input type="radio" name="bl-dismiss-reason" value="postponed"
 *        onchange="Backlog.toggleSnoozeOptions(this.checked)">
 *      Remind me later
 *    </label>
 *    <div id="bl-snooze-days-row" style="display:none;margin-left:24px;margin-top:6px">
 *      <select id="bl-snooze-days" class="form-select" style="width:auto;font-size:.82rem">
 *        <option value="1">Tomorrow</option>
 *        <option value="3" selected>In 3 days</option>
 *        <option value="7">In 7 days</option>
 *        <option value="-1">After my exam</option>
 *      </select>
 *    </div>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */