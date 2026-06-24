/**
 * backlog.js — StudyOS Study Debt Tracker
 *
 * Requires: db.js (window.DB), app.js (window.App)
 * Exposes:  window.Backlog
 *
 * Prerequisite: Run migration.sql in Supabase SQL Editor once before deploying.
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

  const TYPE_ICONS = {
    lecture_pending:   '📖',
    revision_pending:  '🔄',
    questions_pending: '📝',
    chapter_unstarted: '📌',
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function daysSince(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  function computePriority(createdAt, dueDate) {
    const age   = daysSince(createdAt);
    const until = daysUntil(dueDate);
    if (until !== null && until <= 2) return 'high';
    if (age >= 7)                     return 'high';
    if (age >= 3)                     return 'medium';
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

  function priorityColor(p) {
    if (p === 'high')   return 'var(--danger)';
    if (p === 'medium') return 'var(--warning)';
    return 'var(--text-muted)';
  }

  function toast(msg, type) {
    if (window.App && App.toast) App.toast(msg, type || 'info');
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
    },

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    async init(userId) {
      if (!userId) return;
      await this._loadItems(userId);
      this._refreshDashboardWidget();
      updateNavBadge(this.state.items.length);
    },

    // ── Data ─────────────────────────────────────────────────────────────────

    async _loadItems(userId) {
      this.state.loading = true;
      const { data, error } = await DB.backlog.getActive(userId);
      this.state.loading = false;
      if (error) { console.error('[Backlog] load error:', error); return; }

      // Refresh priorities client-side, then sort
      const items = (data || []).map(item => {
        const fresh = computePriority(item.created_at, item.due_date);
        if (fresh !== item.priority) {
          // Fire-and-forget DB update — priority drift is cosmetic, not critical
          supabase.from('backlog_items').update({ priority: fresh }).eq('id', item.id).then(() => {});
        }
        return { ...item, priority: fresh };
      });

      items.sort((a, b) => {
        const pd = priorityOrder(a.priority) - priorityOrder(b.priority);
        return pd !== 0 ? pd : new Date(a.created_at) - new Date(b.created_at);
      });

      this.state.items = items;
    },

    // ── Actions ──────────────────────────────────────────────────────────────

    async addItem(userId, { subject, chapter, topic, type, dueDate, source }) {
      if (!subject || !chapter || !type) {
        toast('Subject, chapter, and type are required', 'warning');
        return false;
      }

      const isDupe = await DB.backlog.hasDuplicate(userId, subject, chapter, type);
      if (isDupe) {
        toast(`${TYPE_LABELS[type]} for "${chapter}" is already in your backlog`, 'warning');
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
      if (window.App && App.addXP) App.addXP(10, 'Backlog item cleared');
      toast('Cleared ✓', 'success');
      if (App.state.currentPage === 'backlog') this.renderPage();
    },

    openDismissModal(itemId) {
      const item = this.state.items.find(i => i.id === itemId);
      if (!item) return;
      document.getElementById('bl-dismiss-name').textContent = `${item.subject} · ${item.chapter}`;
      document.getElementById('modal-backlog-dismiss').dataset.itemId = itemId;
      document.querySelectorAll('input[name="bl-dismiss-reason"]').forEach(r => r.checked = false);
      App.openModal('modal-backlog-dismiss');
    },

    async confirmDismiss() {
      const modal  = document.getElementById('modal-backlog-dismiss');
      const itemId = modal.dataset.itemId;
      const sel    = modal.querySelector('input[name="bl-dismiss-reason"]:checked');

      if (!sel) { toast('Select a reason', 'warning'); return; }

      const reason  = sel.value;
      const snooze  = reason === 'postponed';
      let snoozeUntil = null;
      if (snooze) {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        snoozeUntil = d.toISOString().split('T')[0];
      }

      const { error } = await DB.backlog.dismiss(itemId, reason, snoozeUntil);
      if (error) { toast('Could not dismiss', 'error'); return; }

      App.closeModal('modal-backlog-dismiss');

      const dismissed = this.state.items.find(i => i.id === itemId);
      this.state.items = this.state.items.filter(i => i.id !== itemId);
      this._afterChange();
      if (App.state.currentPage === 'backlog') this.renderPage();

      this._showUndo(snooze ? 'Snoozed for 3 days' : 'Dismissed', async () => {
        const { error: e } = await DB.backlog.restore(itemId);
        if (e) { toast('Could not restore', 'error'); return; }
        this.state.items.unshift(dismissed);
        this._sort();
        this._afterChange();
        if (App.state.currentPage === 'backlog') this.renderPage();
        toast('Restored', 'info');
      });
    },

    // Auto-add from missed revision — called by App when revision is skipped
    async autoAddFromRevision(userId, subject, chapter) {
      await this.addItem(userId, {
        subject, chapter,
        type:   'revision_pending',
        source: 'auto_revision',
      });
    },

    // ── Add Modal ─────────────────────────────────────────────────────────────

    openAddModal() {
      const subjects = (window.App?.state?.subjects) || [];
      const sel = document.getElementById('bl-subject');
      sel.innerHTML = `<option value="">Select subject…</option>` +
        subjects.map(s => `<option value="${s.name}">${s.icon || ''} ${s.name}</option>`).join('');
      document.getElementById('bl-chapter').innerHTML = `<option value="">Select subject first…</option>`;
      document.getElementById('bl-topic').value = '';
      document.getElementById('bl-due').value = '';
      document.querySelectorAll('input[name="bl-type"]').forEach(r => r.checked = false);
      App.openModal('modal-backlog-add');
    },

    onSubjectChange(sel) {
      const subjectName = sel.value;
      const chapterSel  = document.getElementById('bl-chapter');
      if (!subjectName) {
        chapterSel.innerHTML = `<option value="">Select subject first…</option>`;
        return;
      }
      const subject = (window.App?.state?.subjects || []).find(s => s.name === subjectName);
      chapterSel.innerHTML = `<option value="">Select chapter…</option>` +
        (subject?.chapters || []).map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    },

    async submitAdd() {
      const userId  = window._supabaseUserId;
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
      btn.disabled = true;
      btn.textContent = 'Adding…';

      const ok = await this.addItem(userId, {
        subject, chapter, topic, type: typeEl.value, dueDate,
      });

      btn.disabled = false;
      btn.textContent = 'Add to Backlog';
      if (ok) {
        App.closeModal('modal-backlog-add');
        if (App.state.currentPage === 'backlog') this.renderPage();
      }
    },

    // ── Render: Dashboard Widget ─────────────────────────────────────────────

    renderDashboardWidget() {
      const items = this.state.items;
      if (!items.length) return '';

      const top   = items[0];
      const count = items.length;
      const more  = count - 1;
      const pColor = priorityColor(top.priority);
      const age    = formatAge(top.created_at);

      return `<div class="card bl-widget" style="border-left:3px solid ${pColor};margin-bottom:12px">
        <div class="card-header" style="margin-bottom:10px">
          <span class="card-title" style="display:flex;align-items:center;gap:6px">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Study Debt
          </span>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('backlog')" style="font-size:.72rem">
            View all (${count}) →
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.3rem;flex-shrink:0">${TYPE_ICONS[top.type] || '📋'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.84rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${top.subject} · ${top.chapter}
            </div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">
              ${TYPE_LABELS[top.type]} &nbsp;·&nbsp; <span style="color:${pColor}">${age}</span>
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

    // ── Render: Full Backlog Page ─────────────────────────────────────────────

    async renderPage() {
      const el = document.getElementById('page-backlog');
      if (!el) return;

      const userId = window._supabaseUserId;
      if (!userId) {
        el.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🔒</span><div class="empty-state-title">Sign in to view your backlog</div></div>`;
        return;
      }

      // Always re-fetch — same pattern as tasks (date-sensitive data)
      el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:.85rem">Loading…</div>`;
      await this._loadItems(userId);
      updateNavBadge(this.state.items.length);

      const items = this.state.items;

      if (items.length === 0) {
        el.innerHTML = `
          <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
            <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
          </div>
          <div class="empty-state">
            <span class="empty-state-icon">✅</span>
            <div class="empty-state-title">All caught up</div>
            <div class="empty-state-desc">No pending backlog items. Keep the momentum going.</div>
          </div>`;
        return;
      }

      const high   = items.filter(i => i.priority === 'high');
      const medium = items.filter(i => i.priority === 'medium');
      const low    = items.filter(i => i.priority === 'low');

      const renderGroup = (label, color, group) => {
        if (!group.length) return '';
        return `<div class="bl-group-label" style="color:${color}">${label} · ${group.length}</div>
          ${group.map(i => this._itemCard(i)).join('')}`;
      };

      el.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
        </div>
        ${renderGroup('HIGH PRIORITY', 'var(--danger)', high)}
        ${renderGroup('MEDIUM PRIORITY', 'var(--warning)', medium)}
        ${renderGroup('LOW PRIORITY', 'var(--text-muted)', low)}
        <div style="text-align:center;font-size:.72rem;color:var(--text-muted);padding:20px 0">
          ${items.length} pending item${items.length !== 1 ? 's' : ''}
        </div>`;
    },

    _itemCard(item) {
      const pColor  = priorityColor(item.priority);
      const age     = formatAge(item.created_at);
      const until   = daysUntil(item.due_date);
      const dueBadge = item.due_date
        ? `<span style="font-size:.64rem;padding:2px 7px;border-radius:5px;font-weight:600;background:${until !== null && until <= 2 ? 'var(--color-danger-bg,rgba(239,68,68,0.1))' : 'rgba(99,102,241,0.08)'};color:${until !== null && until <= 2 ? 'var(--danger)' : 'var(--accent-light)'}">
            Due ${until !== null ? (until > 0 ? `in ${until}d` : until === 0 ? 'today' : 'overdue') : ''}
           </span>`
        : '';

      return `<div class="card bl-item-card" style="border-left:3px solid ${pColor};margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:1.25rem;flex-shrink:0;margin-top:1px">${TYPE_ICONS[item.type] || '📋'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${item.subject} · ${item.chapter}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px">
              <span style="font-size:.72rem;color:var(--text-muted)">${TYPE_LABELS[item.type]}</span>
              <span style="font-size:.65rem;color:var(--text-muted)">·</span>
              <span style="font-size:.72rem;color:${pColor}">${age}</span>
              ${dueBadge}
            </div>
            ${item.topic ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:3px">Topic: ${item.topic}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary btn-sm" style="flex:1"
            onclick="Backlog.markComplete('${item.id}')">Mark Done</button>
          <button class="btn btn-ghost btn-sm"
            onclick="Backlog.openDismissModal('${item.id}')">Dismiss</button>
        </div>
      </div>`;
    },

    // ── Internals ─────────────────────────────────────────────────────────────

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

    // 5-second undo toast
    _undoFn: null,
    _undoTimer: null,
    _showUndo(label, fn) {
      document.getElementById('bl-undo-bar')?.remove();
      clearTimeout(this._undoTimer);
      this._undoFn = fn;

      const bar = document.createElement('div');
      bar.id = 'bl-undo-bar';
      bar.innerHTML = `<span>${label}</span>
        <button onclick="Backlog._undo()" style="background:none;border:none;cursor:pointer;
          color:var(--accent-light);font-weight:700;font-size:.82rem;padding:0;margin-left:12px">Undo</button>`;
      Object.assign(bar.style, {
        position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)',
        background:'var(--color-surface)', border:'1px solid var(--border)',
        borderRadius:'8px', padding:'10px 16px', display:'flex', alignItems:'center',
        fontSize:'.82rem', zIndex:'9999', boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
        whiteSpace:'nowrap', animation:'blFadeUp .2s ease',
      });
      document.body.appendChild(bar);

      this._undoTimer = setTimeout(() => {
        bar.remove();
        this._undoFn = null;
      }, 5000);
    },

    async _undo() {
      document.getElementById('bl-undo-bar')?.remove();
      clearTimeout(this._undoTimer);
      if (this._undoFn) { await this._undoFn(); this._undoFn = null; }
    },
  };

  // ── Hook into App.navigate ─────────────────────────────────────────────────
  //
  // Deferred so app.js has time to define App before this runs.

  function _hookNavigate() {
    if (!window.App || !App.navigate) {
      setTimeout(_hookNavigate, 100);
      return;
    }
    const _orig = App.navigate.bind(App);
    App.navigate = function (page) {
      _orig(page);
      if (page === 'backlog') Backlog.renderPage();
    };
  }
  _hookNavigate();

  // ── Hook into auth state ───────────────────────────────────────────────────

  function _hookAuth() {
    if (!window.DB || !DB.auth) { setTimeout(_hookAuth, 100); return; }
    DB.auth.onChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        await Backlog.init(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        Backlog.state.items = [];
        updateNavBadge(0);
        Backlog._refreshDashboardWidget();
      }
    });
  }
  _hookAuth();

  // ── Init if already signed in ─────────────────────────────────────────────

  async function _initIfAuthed() {
    if (!window.DB) { setTimeout(_initIfAuthed, 100); return; }
    try {
      const { data } = await DB.auth.getSession();
      const userId = data?.data?.session?.user?.id;
      if (userId) await Backlog.init(userId);
    } catch (_) {}
  }
  _initIfAuthed();

  window.Backlog = Backlog;

})();