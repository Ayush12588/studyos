/**
 * notifications.js — StudyOS in-app notification system (Phase 1)
 *
 * ARCHITECTURE
 * ────────────
 * • Supabase table: notifications (id, user_id, type, title, body, action_url, read, created_at)
 * • Realtime: SIGNED_IN → subscribe to INSERT on notifications for current user
 * • Bell icon lives in the topbar (injected by this module, no HTML change needed)
 * • Dropdown panel renders below the bell on click
 * • Unread badge updates live via Supabase realtime channel
 *
 * PUBLIC API (used from app.js / backlog.js)
 * ───────────────────────────────────────────
 *   Notifications.init(userId)            — call after SIGNED_IN, before first render
 *   Notifications.send(type, title, body, actionUrl?)  — insert a notification for current user
 *   Notifications.destroy()               — unsub realtime channel on sign-out
 *
 * TRIGGER SITES (add these calls in app.js / backlog.js)
 * ───────────────────────────────────────────────────────
 *   1. After badge earned     → Notifications.send('badge', ...)
 *   2. After backlog created  → Notifications.send('backlog_alert', ...)
 *   3. After streak milestone → Notifications.send('streak', ...)
 *   4. On revision due        → Notifications.send('revision', ...)
 */

const Notifications = (() => {

  // ─── State ─────────────────────────────────────────────────────────────────

  let _userId       = null;
  let _channel      = null;
  let _items        = [];        // { id, type, title, body, action_url, read, created_at }
  let _panelOpen    = false;
  let _initialized  = false;

  // ─── Icons (Lucide-style SVG, matching your existing icon system) ───────────

  const BELL_SVG = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`;

  const TYPE_ICONS = {
    backlog_alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    streak:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    badge:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    revision:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>`,
    announcement:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  };

  const TYPE_COLORS = {
    backlog_alert: 'var(--text-danger, #ef4444)',
    streak:        'var(--text-warning, #f59e0b)',
    badge:         '#a78bfa',
    revision:      'var(--accent-light, #818cf8)',
    announcement:  'var(--text-success, #10b981)',
  };

  // ─── Relative time ──────────────────────────────────────────────────────────

  function _reltime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // ─── Supabase helpers ───────────────────────────────────────────────────────

  async function _fetch() {
    const { data, error } = await window.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', _userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      _items = data;
      _renderBell();
    }
  }

  async function _markRead(id) {
    _items = _items.map(n => n.id === id ? { ...n, read: true } : n);
    _renderBell();
    _renderPanel();
    await window.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', _userId);
  }

  async function _markAllRead() {
    _items = _items.map(n => ({ ...n, read: true }));
    _renderBell();
    _renderPanel();
    await window.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', _userId)
      .eq('read', false);
  }

  // ─── DOM: Bell button (injected into topbar) ────────────────────────────────
  //
  // Inserts a bell button just before the existing topbar-right area.
  // This doesn't require any HTML change — it self-injects on init().

  function _injectBell() {
    if (document.getElementById('notif-bell-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'notif-bell-btn';
    btn.className = 'notif-bell-btn';
    btn.setAttribute('aria-label', 'Notifications');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `${BELL_SVG}<span class="notif-badge" id="notif-badge" aria-live="polite" style="display:none"></span>`;
    btn.addEventListener('click', _togglePanel);

    // Inject into topbar — try common anchor points in your HTML
    const anchors = [
      '#topbar-right',
      '.topbar-actions',
      '.topbar-right',
      '.topbar',
    ];
    let injected = false;
    for (const sel of anchors) {
      const el = document.querySelector(sel);
      if (el) {
        el.prepend(btn);
        injected = true;
        break;
      }
    }
    if (!injected) {
      // Last resort: append to body for visibility; you can reposition via CSS
      console.warn('[Notifications] Could not find topbar anchor — appended to body. Add id="topbar-right" to your topbar actions div.');
      document.body.appendChild(btn);
    }

    // Close panel on outside click
    document.addEventListener('click', (e) => {
      if (_panelOpen && !e.target.closest('#notif-bell-btn') && !e.target.closest('#notif-panel')) {
        _closePanel();
      }
    });
  }

  function _renderBell() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const unread = _items.filter(n => !n.read).length;
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    const btn = document.getElementById('notif-bell-btn');
    if (btn) btn.setAttribute('aria-expanded', String(_panelOpen));
  }

  // ─── DOM: Notification panel ────────────────────────────────────────────────

  function _togglePanel() {
    _panelOpen ? _closePanel() : _openPanel();
  }

  function _openPanel() {
    _panelOpen = true;
    _renderPanel();
    const btn = document.getElementById('notif-bell-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function _closePanel() {
    _panelOpen = false;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.remove();
    const btn = document.getElementById('notif-bell-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function _renderPanel() {
    let panel = document.getElementById('notif-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'notif-panel';
      panel.className = 'notif-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Notifications');
      // Anchor next to the bell button
      const bell = document.getElementById('notif-bell-btn');
      if (bell) {
        bell.parentElement.style.position = 'relative';
        bell.parentElement.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }
    }

    const unread = _items.filter(n => !n.read).length;

    panel.innerHTML = `
      <div class="notif-panel-header">
        <span class="notif-panel-title">Notifications</span>
        ${unread > 0
          ? `<button class="notif-mark-all-btn" onclick="window._Notifications_markAllRead()">Mark all read</button>`
          : ''}
      </div>
      <div class="notif-list" role="list">
        ${_items.length === 0
          ? `<div class="notif-empty">No notifications yet</div>`
          : _items.map(_renderItem).join('')}
      </div>
    `;
  }

  function _renderItem(n) {
    const icon  = TYPE_ICONS[n.type]  || TYPE_ICONS.announcement;
    const color = TYPE_COLORS[n.type] || 'var(--accent-light)';
    const time  = _reltime(n.created_at);
    const clickAttr = n.action_url
      ? `onclick="window._Notifications_click('${n.id}', '${n.action_url}')"`
      : `onclick="window._Notifications_click('${n.id}', null)"`;

    return `
      <div class="notif-item ${n.read ? '' : 'unread'}" role="listitem" ${clickAttr}>
        <div class="notif-item-icon" style="color:${color}">${icon}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${_escape(n.title)}</div>
          <div class="notif-item-desc">${_escape(n.body)}</div>
          <div class="notif-item-time">${time}</div>
        </div>
        ${!n.read ? '<div class="notif-dot" aria-hidden="true"></div>' : ''}
      </div>`;
  }

  function _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Global click handlers (called from panel innerHTML) ────────────────────

  window._Notifications_click = async (id, actionUrl) => {
    await _markRead(id);
    if (actionUrl && window.App) {
      _closePanel();
      window.App.navigate(actionUrl);
    }
  };

  window._Notifications_markAllRead = () => _markAllRead();

  // ─── Realtime subscription ──────────────────────────────────────────────────

  function _subscribe() {
    if (_channel) _channel.unsubscribe();

    _channel = window.supabase
      .channel(`notifications:${_userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${_userId}`,
        },
        (payload) => {
          _items = [payload.new, ..._items].slice(0, 30);
          _renderBell();
          if (_panelOpen) _renderPanel();
          // Show a toast for new incoming notification
          if (window.App && typeof App.toast === 'function') {
            App.toast(`${payload.new.title}`, 'info');
          }
        }
      )
      .subscribe();
  }

  // ─── CSS injection ──────────────────────────────────────────────────────────
  //
  // Self-contained styles so you don't need to touch styles.css right now.
  // Later you can move these to styles.css.

  function _injectStyles() {
    if (document.getElementById('notif-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      /* ── Bell button ── */
      .notif-bell-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary, #94a3b8);
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        flex-shrink: 0;
      }
      .notif-bell-btn:hover {
        background: var(--color-surface-hover, rgba(255,255,255,0.06));
        color: var(--text-primary, #f1f5f9);
      }

      /* ── Unread badge ── */
      .notif-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        background: #ef4444;
        color: #fff;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        pointer-events: none;
        border: 2px solid var(--bg-main, #0f1117);
      }

      /* ── Panel ── */
      .notif-panel {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 340px;
        max-height: 440px;
        background: var(--bg-card, #1a1d27);
        border: 1px solid var(--border, rgba(255,255,255,0.08));
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        z-index: 1000;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .notif-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px 10px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
        flex-shrink: 0;
      }
      .notif-panel-title {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-primary, #f1f5f9);
        letter-spacing: 0.02em;
      }
      .notif-mark-all-btn {
        font-size: 0.72rem;
        color: var(--accent-light, #818cf8);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        transition: opacity 0.15s;
      }
      .notif-mark-all-btn:hover { opacity: 0.75; }

      /* ── List ── */
      .notif-list {
        overflow-y: auto;
        flex: 1;
      }
      .notif-list::-webkit-scrollbar { width: 4px; }
      .notif-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

      .notif-empty {
        padding: 32px 16px;
        text-align: center;
        font-size: 0.82rem;
        color: var(--text-muted, #64748b);
      }

      /* ── Item ── */
      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
        transition: background 0.1s;
        position: relative;
      }
      .notif-item:last-child { border-bottom: none; }
      .notif-item:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); }
      .notif-item.unread { background: rgba(99,102,241,0.05); }
      .notif-item.unread:hover { background: rgba(99,102,241,0.09); }

      .notif-item-icon {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        background: rgba(255,255,255,0.05);
        margin-top: 1px;
      }

      .notif-item-body {
        flex: 1;
        min-width: 0;
      }
      .notif-item-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-primary, #f1f5f9);
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .notif-item-desc {
        font-size: 0.73rem;
        color: var(--text-secondary, #94a3b8);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .notif-item-time {
        font-size: 0.68rem;
        color: var(--text-muted, #64748b);
        margin-top: 4px;
        font-family: 'JetBrains Mono', monospace;
      }

      /* ── Unread dot ── */
      .notif-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent-light, #818cf8);
        flex-shrink: 0;
        margin-top: 5px;
      }

      /* ── Mobile ── */
      @media (max-width: 600px) {
        .notif-panel {
          position: fixed;
          top: 56px;
          left: 12px;
          right: 12px;
          width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  return {

    /**
     * init(userId)
     * Call this inside App.init() after session is confirmed.
     * It's safe to call multiple times — re-init is a no-op.
     */
    async init(userId) {
      if (_initialized && _userId === userId) return;
      _userId = userId;
      _initialized = true;

      _injectStyles();
      _injectBell();
      await _fetch();
      _subscribe();
    },

    /**
     * send(type, title, body, actionUrl?)
     * Inserts a notification for the current user.
     * Realtime channel will update the bell automatically.
     *
     * @param {string} type       — 'backlog_alert' | 'streak' | 'badge' | 'revision' | 'announcement'
     * @param {string} title      — short heading
     * @param {string} body       — one-line description
     * @param {string} [actionUrl]— page to navigate to on click (e.g. 'backlog')
     */
    async send(type, title, body, actionUrl = null) {
      if (!_userId) { console.warn('[Notifications] Not initialised — call init(userId) first'); return; }
      const { error } = await window.supabase
        .from('notifications')
        .insert({ user_id: _userId, type, title, body, action_url: actionUrl });
      if (error) console.error('[Notifications] send:', error);
    },

    /**
     * destroy()
     * Unsubscribe the realtime channel on sign-out.
     * Call from your SIGNED_OUT handler.
     */
    destroy() {
      if (_channel) { _channel.unsubscribe(); _channel = null; }
      _userId      = null;
      _initialized = false;
      _items       = [];
      _panelOpen   = false;
      const panel = document.getElementById('notif-panel');
      if (panel) panel.remove();
    },
  };

})();

window.Notifications = Notifications;