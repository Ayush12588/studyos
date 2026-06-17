// DB is available as window.DB (set by bundled db.js)
// supabase client is exposed on window by db.js
const supabase = window.supabase;

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY = 'studyos_data'; // legacy key — app now uses 'studyos_ui' (UI-only)
const BASE64_RE = /data:[\w/+]+;base64,[A-Za-z0-9+/=]+/g;
const PLACEHOLDER = '[attachment removed — re-upload manually]';

const STEPS = [
  { key: 'profile',     label: 'Profile' },
  { key: 'subjects',    label: 'Subjects' },
  { key: 'chapters',    label: 'Chapters' },
  { key: 'sessions',    label: 'Sessions' },
  { key: 'tasks',       label: 'Tasks' },
  { key: 'doubts',      label: 'Doubts' },
  { key: 'examScores',  label: 'Exam Scores' },
  { key: 'notes',       label: 'Notes' },
  { key: 'resources',   label: 'Resources' },
  { key: 'challenges',  label: 'Challenges' },
  { key: 'checkins',    label: 'Check-ins' },
  { key: 'badges',      label: 'Badges' },
  { key: 'quizData',    label: 'Quiz Data' },
  { key: 'exercises',   label: 'Exercises' },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('migrate-styles')) return;
  const style = document.createElement('style');
  style.id = 'migrate-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

    #migrate-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(8, 8, 12, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-family: 'Sora', sans-serif;
      animation: mg-fade-in 0.35s ease both;
    }

    @keyframes mg-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    #migrate-card {
      position: relative;
      width: min(480px, calc(100vw - 32px));
      background: #0e0f17;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 40px 36px 32px;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 40px 80px rgba(0,0,0,0.7),
        0 0 120px rgba(99, 102, 241, 0.08);
      animation: mg-slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes mg-slide-up {
      from { transform: translateY(28px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    .mg-lotus {
      width: 48px;
      height: 48px;
      margin-bottom: 20px;
      opacity: 0.9;
    }

    #migrate-card h2 {
      margin: 0 0 8px;
      font-size: 1.35rem;
      font-weight: 700;
      color: #f0f0f8;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }

    #migrate-card p {
      margin: 0 0 28px;
      font-size: 0.875rem;
      color: rgba(240,240,248,0.5);
      line-height: 1.6;
      font-weight: 300;
    }

    #mg-btn-import {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #fff;
      font-family: 'Sora', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      box-shadow: 0 4px 20px rgba(99,102,241,0.35);
    }

    #mg-btn-import:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    #mg-btn-import:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    #mg-skip {
      display: block;
      margin-top: 14px;
      text-align: center;
      font-size: 0.8rem;
      color: rgba(240,240,248,0.3);
      cursor: pointer;
      background: none;
      border: none;
      font-family: 'Sora', sans-serif;
      transition: color 0.2s;
      padding: 4px 0;
      width: 100%;
      letter-spacing: 0.01em;
    }

    #mg-skip:hover { color: rgba(240,240,248,0.6); }

    /* Progress list */
    #mg-progress {
      display: none;
      margin: 0 0 20px;
      padding: 0;
      list-style: none;
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.3) transparent;
    }

    #mg-progress li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      font-size: 0.82rem;
      color: rgba(240,240,248,0.45);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: color 0.2s;
    }

    #mg-progress li:last-child { border-bottom: none; }

    #mg-progress li.mg-done   { color: rgba(240,240,248,0.85); }
    #mg-progress li.mg-active { color: #a5b4fc; }
    #mg-progress li.mg-error  { color: #f87171; }

    .mg-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background: rgba(255,255,255,0.12);
      transition: background 0.2s;
    }

    .mg-done  .mg-dot { background: #34d399; }
    .mg-active .mg-dot {
      background: #6366f1;
      animation: mg-pulse 1s ease-in-out infinite;
    }
    .mg-error .mg-dot { background: #f87171; }

    @keyframes mg-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.7); }
    }

    /* Error / success banners */
    #mg-message {
      display: none;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 0.82rem;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    #mg-message.mg-success {
      background: rgba(52,211,153,0.1);
      border: 1px solid rgba(52,211,153,0.25);
      color: #6ee7b7;
    }

    #mg-message.mg-error {
      background: rgba(248,113,113,0.1);
      border: 1px solid rgba(248,113,113,0.25);
      color: #fca5a5;
    }

    #mg-btn-retry {
      display: none;
      width: 100%;
      padding: 14px 20px;
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 12px;
      background: transparent;
      color: #a5b4fc;
      font-family: 'Sora', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      margin-bottom: 0;
    }

    #mg-btn-retry:hover {
      background: rgba(99,102,241,0.1);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
}

// ─── Modal HTML ───────────────────────────────────────────────────────────────

function buildModal() {
  const overlay = document.createElement('div');
  overlay.id = 'migrate-overlay';
  overlay.innerHTML = `
    <div id="migrate-card">
      <svg class="mg-lotus" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 42C24 42 8 32 8 20C8 14.477 12.477 10 18 10C20.387 10 22.57 10.875 24 12.344C25.43 10.875 27.613 10 30 10C35.523 10 40 14.477 40 20C40 32 24 42 24 42Z" fill="url(#lg1)" opacity="0.9"/>
        <path d="M24 38C24 38 12 29.5 12 21C12 16.582 15.582 13 20 13C21.942 13 23.716 13.692 25.092 14.85C26.234 13.692 27.823 13 29.6 13C34.018 13 37.6 16.582 37.6 21C37.6 29.5 24 38 24 38Z" fill="url(#lg2)" opacity="0.6"/>
        <path d="M24 8C24 8 20 4 16 6C16 6 18 12 24 14C30 12 32 6 32 6C28 4 24 8 24 8Z" fill="url(#lg3)" opacity="0.7"/>
        <defs>
          <linearGradient id="lg1" x1="8" y1="10" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stop-color="#818cf8"/>
            <stop offset="1" stop-color="#4f46e5"/>
          </linearGradient>
          <linearGradient id="lg2" x1="12" y1="13" x2="37.6" y2="38" gradientUnits="userSpaceOnUse">
            <stop stop-color="#a5b4fc"/>
            <stop offset="1" stop-color="#6366f1"/>
          </linearGradient>
          <linearGradient id="lg3" x1="16" y1="4" x2="32" y2="14" gradientUnits="userSpaceOnUse">
            <stop stop-color="#c7d2fe"/>
            <stop offset="1" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
      </svg>

      <h2>Import your existing data</h2>
      <p>We found your local study data. Import it to your account so you never lose it.</p>

      <div id="mg-message"></div>

      <ul id="mg-progress">
        ${STEPS.map(s => `<li id="mg-step-${s.key}"><span class="mg-dot"></span>${s.label}</li>`).join('')}
      </ul>

      <button id="mg-btn-import">Import Now</button>
      <button id="mg-btn-retry">Retry</button>
      <button id="mg-skip">Start fresh instead</button>
    </div>
  `;
  return overlay;
}

// ─── Timezone Helpers ─────────────────────────────────────────────────────────

// localStorage timestamps were created in the browser's local clock (IST, UTC+5:30).
// They may arrive as:
//   (a) "2024-03-15T23:45:00.000Z"        — already UTC (correct, pass through)
//   (b) "2024-03-15T23:45:00+05:30"       — ISO with IST offset (parse directly, correct)
//   (c) "2024-03-15T23:45:00"             — naive local string, no tz info
//   (d) 1710545100000                     — Unix ms timestamp (always UTC, correct)
//
// Case (c) is the dangerous one: JS Date parses naive ISO strings as UTC (per spec),
// so "2024-03-15T23:45:00" → 2024-03-15 23:45 UTC, but the user meant 23:45 IST
// (= 18:15 UTC). We must shift it back by IST_OFFSET_MS to recover the correct UTC moment.
//
// We detect case (c) by the absence of any timezone indicator (Z, +, or trailing offset).

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

const NAIVE_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * Normalise a localStorage timestamp to a UTC ISO string.
 * Returns null if the value is missing or unparseable.
 */
function toUTCISOString(value) {
  if (value == null || value === '') return null;

  // Numeric Unix-ms — always UTC
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  const str = String(value).trim();

  // Naive local string — interpret as IST, convert to UTC
  if (NAIVE_ISO_RE.test(str)) {
    const localMs = new Date(str + 'Z').getTime(); // parsed as if UTC
    return new Date(localMs - IST_OFFSET_MS).toISOString();
  }

  // ISO with offset or trailing Z — Date constructor handles this correctly
  const ms = Date.parse(str);
  if (Number.isNaN(ms)) {
    console.warn('[migrate] unparseable timestamp:', str);
    return null;
  }
  return new Date(ms).toISOString();
}

/**
 * Derive the local IST date string (YYYY-MM-DD) from a UTC ISO timestamp.
 * Used to re-key date-indexed records whose date may have been stored in UTC.
 *
 * Example: "2024-03-15T19:30:00.000Z" → "2024-03-16" (IST next day)
 *          "2024-03-15T18:00:00.000Z" → "2024-03-15" (still 23:30 IST same day)
 */
function toISTDateString(utcISOString) {
  if (!utcISOString) return null;
  const ms = Date.parse(utcISOString);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripBase64(obj) {
  if (!obj) return obj;
  const str = JSON.stringify(obj);
  const cleaned = str.replace(BASE64_RE, PLACEHOLDER);
  return JSON.parse(cleaned);
}

function showMessage(type, text) {
  const el = document.getElementById('mg-message');
  el.className = `mg-message mg-${type}`;
  el.textContent = text;
  el.style.display = 'block';
}

function hideMessage() {
  const el = document.getElementById('mg-message');
  el.style.display = 'none';
}

function setStepState(key, state) {
  const li = document.getElementById(`mg-step-${key}`);
  if (!li) return;
  li.className = state; // 'mg-active' | 'mg-done' | 'mg-error'
}

function removeOverlay() {
  const ov = document.getElementById('migrate-overlay');
  if (ov) ov.remove();
}

// ─── Migration Logic ──────────────────────────────────────────────────────────

async function runMigration(userId, localData) {
  const progressEl = document.getElementById('mg-progress');
  const importBtn  = document.getElementById('mg-btn-import');
  const retryBtn   = document.getElementById('mg-btn-retry');
  const skipBtn    = document.getElementById('mg-skip');

  progressEl.style.display = 'block';
  importBtn.style.display  = 'none';
  retryBtn.style.display   = 'none';
  skipBtn.style.display    = 'none';
  hideMessage();

  let failedStep = null;

  // Helper: run a single migration step
  async function step(key, fn) {
    setStepState(key, 'mg-active');
    try {
      await fn();
      setStepState(key, 'mg-done');
    } catch (e) {
      setStepState(key, 'mg-error');
      failedStep = key;
      throw e;
    }
  }

  try {
    // 1. Profile
    await step('profile', async () => {
      const profile = localData.profile || {};
      const name = profile.name || localData.user?.name || 'User';
      const { error } = await window.DB.profile.update(userId, {
        name,
        ...(profile.avatar_url && { avatar_url: profile.avatar_url }),
        migration_done: true,
      });
      // If update fails because row doesn't exist, create it
      if (error) {
        const { error: createErr } = await window.DB.profile.createDefault(userId, name);
        if (createErr) throw createErr;
        // Try setting migration_done again after creation
        await window.DB.profile.update(userId, { migration_done: true });
      }
    });

    // 2. Subjects  →  build id map for downstream use
    const subjectIdMap = {};
    const subjects = localData.subjects || [];

    await step('subjects', async () => {
      for (const s of subjects) {
        const oldId = s.id;
        const payload = { name: s.name, color: s.color, icon: s.icon, target_hours: s.target_hours };
        const { data, error } = await window.DB.subjects.create(userId, payload);
        if (error) throw error;
        subjectIdMap[oldId] = data.id;
      }
    });

    // 3. Chapters
    const chapters = localData.chapters || [];
    const chapterIdMap = {};

    await step('chapters', async () => {
      for (const c of chapters) {
        const oldId = c.id;
        const newSubjectId = subjectIdMap[c.subject_id] ?? c.subject_id;
        const payload = {
          subject_id: newSubjectId,
          name: c.name,
          order_index: c.order_index,
          completed: c.completed,
        };
        const { data, error } = await window.DB.chapters.create(payload);
        if (error) throw error;
        chapterIdMap[oldId] = data.id;
      }
    });

    // 4. Sessions
    const sessions = localData.sessions || [];

    await step('sessions', async () => {
      for (const s of sessions) {
        const newSubjectId = subjectIdMap[s.subject_id] ?? s.subject_id;

        // Normalise started_at: naive local IST strings must be shifted to UTC
        // so getByDate(userId, 'YYYY-MM-DD') — which uses UTC bounds — returns
        // sessions on the correct IST calendar date.
        const startedAtUTC = toUTCISOString(s.started_at);
        if (!startedAtUTC) {
          console.warn('[migrate] session skipped — unparseable started_at:', s);
          continue;
        }

        const payload = {
          user_id: userId,
          subject_id: newSubjectId,
          chapter_id: s.chapter_id ? (chapterIdMap[s.chapter_id] ?? s.chapter_id) : null,
          started_at: startedAtUTC,
          duration_seconds: s.duration_seconds,
          note: s.note,
        };
        const { error } = await window.DB.sessions.create(payload);
        if (error) throw error;
      }
    });

    // 5. Tasks
    // task.date is a plain YYYY-MM-DD string. If the app generated it via
    // new Date().toISOString().slice(0,10) it's a UTC date, which is wrong for
    // IST users working after 18:30. Re-derive from the IST wall-clock date
    // embedded in task.created_at (if present), otherwise trust the stored date.
    const tasks = localData.tasks || [];

    await step('tasks', async () => {
      for (const t of tasks) {
        const istDate = t.created_at ? toISTDateString(toUTCISOString(t.created_at)) : null;
        const payload = {
          user_id: userId,
          date: istDate ?? t.date,
          text: t.text,
          completed: t.completed,
        };
        const { error } = await window.DB.tasks.create(payload);
        if (error) throw error;
      }
    });

    // 6. Doubts
    const doubts = localData.doubts || [];

    await step('doubts', async () => {
      for (const d of doubts) {
        const newSubjectId = subjectIdMap[d.subject_id] ?? d.subject_id;
        const payload = {
          user_id: userId,
          subject_id: newSubjectId,
          text: d.text,
          resolved: d.resolved,
          created_at: d.created_at,
        };
        const { error } = await window.DB.doubts.create(payload);
        if (error) throw error;
      }
    });

    // 7. Exam Scores
    const examScores = localData.exam_scores || localData.examScores || [];

    await step('examScores', async () => {
      for (const e of examScores) {
        const newSubjectId = subjectIdMap[e.subject_id] ?? e.subject_id;
        const payload = {
          user_id: userId,
          subject_id: newSubjectId || null,
          name: e.name || e.title || 'Exam',
          scored: e.scored ?? e.score ?? 0,
          total: e.total ?? e.max_score ?? 100,
          date: e.date || e.exam_date || new Date().toISOString().split('T')[0],
        };
        const { error } = await window.DB.examScores.create(payload);
        if (error) throw error;
      }
    });

    // 8. Notes  →  strip base64 attachments
    const notes = (localData.notes || []).map(n => stripBase64(n));

    await step('notes', async () => {
      for (const n of notes) {
        const payload = {
          user_id: userId,
          title: n.title,
          content: n.content,
          tags: n.tags,
          created_at: n.created_at,
          updated_at: n.updated_at,
        };
        const { error } = await window.DB.notes.create(payload);
        if (error) throw error;
      }
    });

    // 9. Resources
    const resources = localData.resources || [];

    await step('resources', async () => {
      for (const r of resources) {
        const payload = {
          user_id: userId,
          title: r.title,
          url: r.url,
          type: r.type,
          subject_id: r.subject_id ? (subjectIdMap[r.subject_id] ?? r.subject_id) : null,
          created_at: r.created_at,
        };
        const { error } = await window.DB.resources.create(payload);
        if (error) throw error;
      }
    });

    // 10. Challenges
    // localData.dailyChallenges is a single object {date, challenges:[], completed:[]}
    // not an array — normalise to array before iterating.
    const challengesRaw = localData.challenges || localData.dailyChallenges || [];
    const challenges = Array.isArray(challengesRaw)
      ? challengesRaw
      : (challengesRaw.date ? [challengesRaw] : Object.entries(challengesRaw).map(([date, val]) => ({ ...val, date })));

    await step('challenges', async () => {
      for (const c of challenges) {
        const istDate = c.created_at ? (toISTDateString(toUTCISOString(c.created_at)) ?? c.date) : c.date;
        if (!istDate) continue;
        const { error } = await window.DB.challenges.upsert(userId, istDate, {
          goal: c.goal,
          completed: c.completed,
          streak: c.streak,
        });
        if (error) throw error;
      }
    });

    // 11. Check-ins
    const checkinsRaw = localData.checkins || {};
    // checkins is stored as an object keyed by date {"YYYY-MM-DD": {...}}, not an array
    const checkins = Array.isArray(checkinsRaw)
      ? checkinsRaw
      : Object.entries(checkinsRaw).map(([date, val]) => ({ ...val, date }));

    await step('checkins', async () => {
      for (const c of checkins) {
        const istDate = c.created_at ? (toISTDateString(toUTCISOString(c.created_at)) ?? c.date) : c.date;
        if (!istDate) continue;
        const { error } = await window.DB.checkins.upsert(userId, istDate, {
          mood: c.mood,
          note: c.note,
          energy: c.energy,
        });
        if (error) throw error;
      }
    });

    // 12. Badges
    const badges = localData.badges || localData.user_badges || [];

    await step('badges', async () => {
      for (const b of badges) {
        const badgeId = b.badge_id ?? b.id;
        const { error } = await window.DB.badges.add(userId, badgeId);
        // Ignore duplicate errors (badge already exists)
        if (error && !error.message?.includes('duplicate')) throw error;
      }
    });

    // 13. Quiz data
    const quizData = localData.quizData || {};

    await step('quizData', async () => {
      for (const [subjectId, qd] of Object.entries(quizData)) {
        const newSubjectId = subjectIdMap[subjectId] ?? subjectId;
        if (!newSubjectId) continue;
        const { error } = await window.DB.quiz.upsert(userId, newSubjectId, { data: JSON.stringify(qd) });
        if (error) throw error;
      }
    });

    // 14. Exercises (stored per chapter in chapters table)
    const exercises = localData.exercises || {};

    await step('exercises', async () => {
      for (const [key, exData] of Object.entries(exercises)) {
        if (!exData || exData.length === 0) continue;
        // key format: "subjectId_chapterId"
        const parts = key.split('_');
        const localSubId = parts[0];
        const localChId = parts.slice(1).join('_');
        const newChapterId = chapterIdMap[localChId];
        if (!newChapterId) continue;
        const { error } = await supabase
          .from('chapters')
          .update({ exercises: JSON.stringify(exData) })
          .eq('id', newChapterId);
        if (error) throw error;
      }
    });

    // 15. Extended profile fields
    await step('profile', async () => {
      const p = localData.profile || {};
      await window.DB.profile.update(userId, {
        xp:                      p.xp ?? 0,
        level:                   p.level ?? 1,
        streak:                  p.streak ?? 0,
        last_study_date:         p.lastStudyDate || null,
        max_daily_minutes:       p.maxDailyMinutes ?? 0,
        mood:                    p.mood || null,
        mood_history:            JSON.stringify(p.moodHistory || []),
        pomodoro_completed:      p.pomodoroCompleted || 0,
        streak_freezes:          localData.streakFreezes ?? 1,
        last_freeze_used_date:   localData.lastFreezeUsedDate || null,
        last_freeze_earned_date: localData.lastFreezeEarnedDate || null,
        pending_freeze_notice:   localData.pendingFreezeNotice || false,
        pomodoro_settings:       JSON.stringify(localData.pomodoroSettings || {}),
      });
    });

    // ── Success ──
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem('studyos_ui');
    localStorage.setItem('studyos_migration_done', userId);
    showMessage('success', '✓ All data imported successfully! Taking you to your dashboard…');
    setTimeout(() => {
      removeOverlay();
      window.location.href = '/dashboard';
    }, 1800);

  } catch (e) {
    console.error('[migrate] Failed at step:', failedStep, e);
    const stepLabel = STEPS.find(s => s.key === failedStep)?.label ?? failedStep;
    showMessage('error', `Import failed at step "${stepLabel}". ${e?.message ?? ''}`);
    retryBtn.style.display = 'block';
    skipBtn.style.display  = 'block';
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function initMigration() {
  // 1. Check for local data (try legacy key first, fall back to exported JSON)
  const raw = localStorage.getItem(LS_KEY) || localStorage.getItem('studyos_ui');
  if (!raw) return;

  let localData;
  try { localData = JSON.parse(raw); } catch { return; }

  const subjects = localData?.subjects;
  if (!Array.isArray(subjects) || subjects.length === 0) return;

  // 2. Get current user
  const { data: sessionData } = await window.DB.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return; // Not authenticated — nothing to migrate yet

  // 3. Check migration_done flag — localStorage first (instant, no Supabase dependency)
  if (localStorage.getItem('studyos_migration_done') === userId) {
    // Always clean up the legacy key so migration never re-triggers
    localStorage.removeItem(LS_KEY);
    return;
  }

  // Also check Supabase profile flag (may fail if schema cache is stale — that's OK)
  try {
    const { data: profile } = await window.DB.profile.get(userId);
    if (profile?.migration_done) {
      localStorage.setItem('studyos_migration_done', userId);
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem('studyos_ui_legacy'); // clean any stale keys
      return;
    }
  } catch { /* Supabase schema cache error — fall through and show modal */ }

  // 4. Build and show modal
  injectStyles();
  const overlay = buildModal();
  document.body.appendChild(overlay);

  // Wire up Import Now
  let migrationData = localData;
  document.getElementById('mg-btn-import').addEventListener('click', () => {
    runMigration(userId, migrationData);
  });

  // Wire up Retry (re-reads localStorage in case partial data was written)
  document.getElementById('mg-btn-retry').addEventListener('click', () => {
    const freshRaw = localStorage.getItem(LS_KEY);
    if (freshRaw) {
      try { migrationData = JSON.parse(freshRaw); } catch { /* keep previous */ }
    }
    document.getElementById('mg-btn-retry').style.display = 'none';
    document.getElementById('mg-skip').style.display = 'none';
    document.getElementById('mg-progress').style.display = 'none';
    // Reset step states
    STEPS.forEach(s => setStepState(s.key, ''));
    runMigration(userId, migrationData);
  });

  // Wire up Start Fresh
  document.getElementById('mg-skip').addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    // Mark migration_done locally so modal never reappears even if Supabase fails
    localStorage.setItem('studyos_migration_done', userId);
    window.DB.profile.update(userId, { migration_done: true }).catch(() => {});
    removeOverlay();
  });
}
window.initMigration = initMigration;
initMigration();