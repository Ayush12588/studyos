/**
 * backlog.js — StudyOS Study Debt Tracker
 * Requires: db.js (window.DB, window.supabase), app.js (App)
 * Exposes:  window.Backlog
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

  // SVG icons — no emojis, consistent with rest of StudyOS
  const TYPE_SVG = {
    lecture_pending: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    revision_pending: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>`,
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
    state: { items: [], loading: false },

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

      const items = (data || []).map(item => {
        const fresh = computePriority(item.created_at, item.due_date);
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
      if (App && App.addXP) App.addXP(10, 'Backlog item cleared');
      toast('Cleared', 'success');
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
      App.openModal('modal-backlog-dismiss');
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
      if (App && App.state.currentPage === 'backlog') this.renderPage();

      this._showUndo(snooze ? 'Snoozed for 3 days' : 'Dismissed', async () => {
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

    // ── Add Modal ─────────────────────────────────────────────────────────────

    async openAddModal() {
      // Defensively ensure subjects are loaded before opening the modal.
      // Covers cases where the fetch hasn't resolved yet or modal is triggered
      // from outside the backlog page (e.g. dashboard widget).
      if (!App?.state?.subjects?.length) {
        await App?._loadTabData('subjects');
      }

      const subjects = (App?.state?.subjects) || [];
      const subjectSel = document.getElementById('bl-subject');

      if (subjects.length === 0) {
        subjectSel.innerHTML = `<option value="">No subjects found — add subjects first</option>`;
      } else {
        subjectSel.innerHTML =
          '<option value="">Select subject…</option>' +
          subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
      }

      document.getElementById('bl-chapter').innerHTML =
        `<option value="">Select subject first…</option>`;
      document.getElementById('bl-topic').value = '';
      document.getElementById('bl-due').value = '';
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
      btn.disabled = true;
      btn.textContent = 'Adding…';

      const ok = await this.addItem(userId, {
        subject, chapter, topic,
        type: typeEl.value, dueDate,
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

    // ── Render: Full Backlog Page ─────────────────────────────────────────────

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

      if (items.length === 0) {
        el.innerHTML = `
          <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
            <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
          </div>
          <div class="empty-state">
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
        return `
          <div class="bl-group-label" style="color:${color}">${label} · ${group.length}</div>
          ${group.map(i => this._itemCard(i)).join('')}`;
      };

      el.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="btn btn-primary" onclick="Backlog.openAddModal()">+ Add Item</button>
        </div>
        ${renderGroup('HIGH PRIORITY',   'var(--color-danger,#ef4444)',  high)}
        ${renderGroup('MEDIUM PRIORITY', 'var(--color-warning,#f59e0b)', medium)}
        ${renderGroup('LOW PRIORITY',    'var(--text-muted)',            low)}
        <div style="text-align:center;font-size:.72rem;color:var(--text-muted);padding:20px 0">
          ${items.length} pending item${items.length !== 1 ? 's' : ''}
        </div>`;
    },

    _itemCard(item) {
      const pc      = pColor(item.priority);
      const until   = daysUntil(item.due_date);
      const dueBadge = item.due_date
        ? `<span class="bl-due-badge" style="color:${until !== null && until <= 2 ? 'var(--color-danger,#ef4444)' : 'var(--text-muted)'}">
             Due ${until !== null ? (until > 0 ? `in ${until}d` : until === 0 ? 'today' : 'overdue') : ''}
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
          color:var(--accent-light,#818cf8);font-weight:700;font-size:.82rem;padding:0;margin-left:12px">
          Undo
        </button>`;
      Object.assign(bar.style, {
        position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)',
        background:'var(--color-surface,#1e1e2e)', border:'1px solid var(--border)',
        borderRadius:'8px', padding:'10px 16px', display:'flex', alignItems:'center',
        fontSize:'.82rem', zIndex:'9999', boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
        whiteSpace:'nowrap', animation:'blFadeUp .2s ease',
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

  // ── Init: poll until App sets window._supabaseUserId ──────────────────────

  function _tryInit() {
    const userId = window._supabaseUserId;
    if (userId) { Backlog.init(userId); return; }
    setTimeout(_tryInit, 200);
  }
  _tryInit();

  window.Backlog = Backlog;
  window.Backlog.onSubjectChange = Backlog.onSubjectChange.bind(Backlog);

})();