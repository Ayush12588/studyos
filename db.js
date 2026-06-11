/**
 * db.js — StudyOS data-access layer
 *
 * PERFORMANCE ARCHITECTURE
 * ────────────────────────
 * Root cause of the 16 530 ms render delay:
 *   app.js was calling DB.subjects.getAll(), DB.sessions.getAll(), etc.
 *   at module-evaluation time, firing 15+ parallel Supabase requests
 *   before the browser had even painted the first frame.
 *
 * Three-layer fix applied here:
 *
 *   1. AUTH GATE  — every data call is wrapped in requireAuth().
 *      If no session exists the call throws immediately instead of
 *      hitting the network and getting a 401 back.
 *
 *   2. LAZY CACHE — getAll-style reads are memoised per user+key.
 *      The first call fetches; subsequent calls within the same
 *      session return the cached promise.  Mutations (create /
 *      update / delete) call invalidate(key) to bust the cache so
 *      the next read re-fetches.
 *
 *   3. initializeDashboard() — a single exported function that
 *      fetches ONLY the two things the home screen needs
 *      (profile + today's challenge) in parallel.  Everything else
 *      is fetched on-demand when the relevant tab/section opens.
 *
 * Call-site contract for app.js
 * ──────────────────────────────
 *   • On auth-state-change SIGNED_IN  → await DB.initializeDashboard(userId)
 *   • On navigate('syllabus')         → await DB.subjects.getAll(userId)
 *   • On subject expand               → await DB.chapters.getBySubject(id)
 *   • On navigate('sessions')         → await DB.sessions.getAll(userId)
 *   • On navigate('tasks')            → await DB.tasks.getByDate(userId, date)
 *   • On navigate('doubts')           → await DB.doubts.getAll(userId)
 *   • On navigate('scores')           → await DB.examScores.getAll(userId)
 *   • On navigate('notes')            → await DB.notes.getAll(userId)
 *   • On navigate('resources')        → await DB.resources.getAll(userId)
 *   • On navigate('rewards')          → await DB.badges.getAll(userId)
 *   • On navigate('quiz')             → await DB.quiz.getBySubject(uid, sid)
 *   • On navigate('checkin')          → await DB.checkins.get(uid, date)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Supabase client ─────────────────────────────────────────────────────────

const supabase = createClient(
  'https://lutkwbxjnzhctgtomran.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dGt3YnhqbnpoY3RndG9tcmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjQxNDgsImV4cCI6MjA5NDY0MDE0OH0.-AAKheuquEqnKRqMkVWPcHlq89FFbaaim7dbS2fbgRY'
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ok  = (data)  => ({ data, error: null });
const err = (error) => ({ data: null, error });

async function run(queryPromise) {
  try {
    const { data, error } = await queryPromise;
    if (error) return err(error);
    return ok(data);
  } catch (e) {
    return err(e);
  }
}

// ─── Auth gate ───────────────────────────────────────────────────────────────
//
// Throws synchronously when there is no active session.
// This makes it impossible for app.js to accidentally fire a DB call before
// the user is authenticated — the error surfaces at the call-site immediately
// instead of as a 401 from the network 400 ms later.

async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('DB: no active session — defer this call until SIGNED_IN');
  return session;
}

// ─── Lazy read-cache ─────────────────────────────────────────────────────────
//
// Why: getAll-style functions are called from multiple places (navigate,
// re-render, badge checks …).  Without a cache every navigate event fires a
// fresh network request even though the data hasn't changed.
//
// How: cache stores { promise } keyed by `${userId}:${table}`.
//   • First call: stores the in-flight promise, returns it.
//   • Subsequent calls: returns the same promise (already resolved).
//   • After any mutation: invalidate(userId, table) deletes the entry so
//     the next getAll re-fetches fresh data.
//
// The cache lives for the lifetime of the page.  On sign-out,
// DB.cache.clear() wipes everything so a subsequent sign-in starts clean.

const _cache = new Map();

const cache = {
  key:        (userId, table) => `${userId}:${table}`,

  get(userId, table, fetcher) {
    const k = cache.key(userId, table);
    if (!_cache.has(k)) _cache.set(k, fetcher());  // store the Promise, not the result
    return _cache.get(k);
  },

  invalidate(userId, table) {
    _cache.delete(cache.key(userId, table));
  },

  clear() {
    _cache.clear();
  },
};

// ─── DB ──────────────────────────────────────────────────────────────────────

export const DB = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  //
  // Auth methods never touch the database so they need no gate or cache.
  // They are the only methods safe to call before authentication.

  auth: {
    async signUp(email, password) {
      return run(supabase.auth.signUp({ email, password }));
    },

    async signIn(email, password) {
      return run(supabase.auth.signInWithPassword({ email, password }));
    },

    async signInWithGoogle() {
      return run(supabase.auth.signInWithOAuth({ provider: 'google' }));
    },

    async signOut() {
      // Clear the lazy cache so a subsequent login doesn't see stale data.
      cache.clear();
      return run(supabase.auth.signOut());
    },

    async getSession() {
      return run(supabase.auth.getSession());
    },

    async getUser() {
      return run(supabase.auth.getUser());
    },

    /**
     * onAuthStateChange — wire this up ONCE in app.js:
     *
     *   DB.auth.onChange(async (event, session) => {
     *     if (event === 'SIGNED_IN')  await DB.initializeDashboard(session.user.id);
     *     if (event === 'SIGNED_OUT') App.showAuthScreen();
     *   });
     *
     * This is the ONLY place where DB data-fetching should be triggered at
     * "startup" time.  Because it's behind an auth event it is guaranteed
     * never to fire before a valid session exists.
     */
    onChange(callback) {
      return supabase.auth.onAuthStateChange(callback);
    },
  },

  // ── initializeDashboard ───────────────────────────────────────────────────
  //
  // The ONE function app.js should call immediately after SIGNED_IN.
  //
  // Fetches ONLY:
  //   • profile        — needed to display the user's name / class / streak
  //   • today's challenge — needed to show the home-screen challenge widget
  //
  // Everything else (subjects, sessions, tasks, notes …) is intentionally
  // excluded.  Those are fetched lazily when the user navigates to each tab.
  //
  // Returns: { profile, challenge } — both may be null if not yet created.
  //
  // Usage:
  //   const { profile, challenge } = await DB.initializeDashboard(userId);

  async initializeDashboard(userId) {
    await requireAuth();   // double-check; should always pass here since we're in SIGNED_IN handler

    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Run the two calls in parallel — neither depends on the other.
    const [profileResult, challengeResult] = await Promise.allSettled([
      run(supabase.from('profiles').select('*').eq('user_id', userId).single()),
      run(supabase.from('challenges').select('*').eq('user_id', userId).eq('date', today).maybeSingle()),
    ]);

    // Seed the cache so the first call from the tab handlers is instant.
    // We wrap the already-resolved values back into a Promise so cache.get()
    // can transparently return them without knowing they were pre-seeded.
    _cache.set(cache.key(userId, 'profiles'),   Promise.resolve(profileResult.value   ?? err(profileResult.reason)));
    _cache.set(cache.key(userId, 'challenges'), Promise.resolve(challengeResult.value ?? err(challengeResult.reason)));

    return {
      profile:   profileResult.status   === 'fulfilled' ? profileResult.value.data   : null,
      challenge: challengeResult.status === 'fulfilled' ? challengeResult.value.data : null,
    };
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  //
  // When to call:
  //   • .get()          — result is pre-seeded by initializeDashboard; calling
  //                       it again returns the cached promise instantly.
  //   • .update()       — user saves settings; invalidates cache.
  //   • .createDefault()— first-ever sign-in; no cache entry yet.

  profile: {
    async get(userId) {
      await requireAuth();
      // Returns cached promise if already seeded by initializeDashboard.
      return cache.get(userId, 'profiles', () =>
        run(supabase.from('profiles').select('*').eq('user_id', userId).single())
      );
    },

    async update(userId, data) {
      await requireAuth();
      cache.invalidate(userId, 'profiles');  // next .get() will re-fetch
      return run(
        supabase.from('profiles').update(data).eq('user_id', userId).select().single()
      );
    },

    async createDefault(userId, name) {
      await requireAuth();
      cache.invalidate(userId, 'profiles');
      return run(
        supabase.from('profiles')
          .insert({ user_id: userId, name, created_at: new Date().toISOString() })
          .select()
          .single()
      );
    },
  },

  // ── Subjects ──────────────────────────────────────────────────────────────
  //
  // When to call .getAll(): user navigates to the Syllabus tab.
  // NOT at page load — subjects are never shown on the initial dashboard view.

  subjects: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'subjects', () =>
        run(supabase.from('subjects').select('*').eq('user_id', userId).order('created_at'))
      );
    },

    async create(userId, subject) {
      await requireAuth();
      cache.invalidate(userId, 'subjects');  // force re-fetch of list
      return run(
        supabase.from('subjects')
          .insert({ ...subject, user_id: userId })
          .select()
          .single()
      );
    },

    async update(id, userId, data) {
      await requireAuth();
      cache.invalidate(userId, 'subjects');
      return run(
        supabase.from('subjects').update(data).eq('id', id).select().single()
      );
    },

    async delete(id, userId) {
      await requireAuth();
      cache.invalidate(userId, 'subjects');
      return run(supabase.from('subjects').delete().eq('id', id));
    },
  },

  // ── Chapters ──────────────────────────────────────────────────────────────
  //
  // When to call: user expands a subject accordion on the Syllabus tab.
  // Cache key includes subjectId so each subject's chapters are cached
  // independently.

  chapters: {
    async getBySubject(subjectId) {
      await requireAuth();
      // We don't have userId here but subjectId is globally unique (UUID),
      // so use it directly as the cache key.
      const k = `chapters:${subjectId}`;
      if (!_cache.has(k)) {
        _cache.set(k, run(
          supabase.from('chapters').select('*').eq('subject_id', subjectId).order('order_index')
        ));
      }
      return _cache.get(k);
    },

    async create(chapter) {
      await requireAuth();
      _cache.delete(`chapters:${chapter.subject_id}`);
      return run(supabase.from('chapters').insert(chapter).select().single());
    },

    async update(id, subjectId, data) {
      await requireAuth();
      _cache.delete(`chapters:${subjectId}`);
      return run(
        supabase.from('chapters').update(data).eq('id', id).select().single()
      );
    },

    async delete(id, subjectId) {
      await requireAuth();
      _cache.delete(`chapters:${subjectId}`);
      return run(supabase.from('chapters').delete().eq('id', id));
    },
  },

  // ── Sessions ──────────────────────────────────────────────────────────────
  //
  // .getAll()    → user navigates to Sessions / History tab.
  // .getByDate() → user opens the daily planner (date-specific, NOT cached
  //                because the date changes daily and the user may log a
  //                session mid-day).

  sessions: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'sessions', () =>
        run(
          supabase.from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        )
      );
    },

    async getByDate(userId, date) {
      await requireAuth();
      // `date` is a local (IST) calendar date: "YYYY-MM-DD".
      // started_at is stored as UTC timestamptz.  We query using the
      // date column (stored as a plain date string) so IST conversion
      // is handled at write time, not read time.
      return run(
        supabase.from('sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .order('created_at')
      );
    },

    async create(session) {
      await requireAuth();
      // Invalidate both the full list and any per-date result the caller
      // might have cached externally.
      cache.invalidate(session.user_id, 'sessions');
      return run(supabase.from('sessions').insert(session).select().single());
    },

    async delete(id, userId) {
      await requireAuth();
      cache.invalidate(userId, 'sessions');
      return run(supabase.from('sessions').delete().eq('id', id));
    },
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  //
  // When to call: user opens the daily planner for a specific date.
  // Tasks are date-scoped so we don't cache them globally — a fresh fetch
  // per date is cheap and avoids stale-data bugs around midnight.

  tasks: {
    async getByDate(userId, date) {
      await requireAuth();
      return run(
        supabase.from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .order('created_at')
      );
    },

    async create(task) {
      await requireAuth();
      return run(supabase.from('tasks').insert(task).select().single());
    },

    async update(id, data) {
      await requireAuth();
      return run(
        supabase.from('tasks').update(data).eq('id', id).select().single()
      );
    },

    async delete(id) {
      await requireAuth();
      return run(supabase.from('tasks').delete().eq('id', id));
    },
  },

  // ── Doubts ────────────────────────────────────────────────────────────────
  //
  // When to call: user navigates to the Doubts tab.

  doubts: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'doubts', () =>
        run(
          supabase.from('doubts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        )
      );
    },

    async create(doubt) {
      await requireAuth();
      cache.invalidate(doubt.user_id, 'doubts');
      return run(supabase.from('doubts').insert(doubt).select().single());
    },

    async update(id, userId, data) {
      await requireAuth();
      cache.invalidate(userId, 'doubts');
      return run(
        supabase.from('doubts').update(data).eq('id', id).select().single()
      );
    },

    async delete(id, userId) {
      await requireAuth();
      cache.invalidate(userId, 'doubts');
      return run(supabase.from('doubts').delete().eq('id', id));
    },
  },

  // ── Exam Scores ───────────────────────────────────────────────────────────
  //
  // When to call: user navigates to the Scores / Results tab.

  examScores: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'exam_scores', () =>
        run(
          supabase.from('exam_scores')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
        )
      );
    },

    async create(score) {
      await requireAuth();
      cache.invalidate(score.user_id, 'exam_scores');
      return run(supabase.from('exam_scores').insert(score).select().single());
    },

    async delete(id, userId) {
      await requireAuth();
      cache.invalidate(userId, 'exam_scores');
      return run(supabase.from('exam_scores').delete().eq('id', id));
    },
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  //
  // When to call: user navigates to the Notes tab.

  notes: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'notes', () =>
        run(
          supabase.from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
        )
      );
    },

    async create(note) {
      await requireAuth();
      cache.invalidate(note.user_id, 'notes');
      return run(supabase.from('notes').insert(note).select().single());
    },

    async update(id, userId, data) {
      await requireAuth();
      cache.invalidate(userId, 'notes');
      return run(
        supabase.from('notes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()
      );
    },

    async delete(id, userId) {
      await requireAuth();
      cache.invalidate(userId, 'notes');
      return run(supabase.from('notes').delete().eq('id', id));
    },
  },

  // ── Resources ─────────────────────────────────────────────────────────────
  //
  // When to call: user navigates to the Resources tab.

  resources: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'resources', () =>
        run(
          supabase.from('resources')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        )
      );
    },

    async create(resource) {
      await requireAuth();
      cache.invalidate(resource.user_id, 'resources');
      return run(supabase.from('resources').insert(resource).select().single());
    },

    async delete(id, userId) {
      await requireAuth();
      cache.invalidate(userId, 'resources');
      return run(supabase.from('resources').delete().eq('id', id));
    },
  },

  // ── Challenges ────────────────────────────────────────────────────────────
  //
  // .getToday() result is pre-seeded by initializeDashboard.
  // .upsert()   is called when the user marks a challenge complete.

  challenges: {
    async getToday(userId, date) {
      await requireAuth();
      // Returns the cache entry seeded by initializeDashboard if still valid.
      return cache.get(userId, 'challenges', () =>
        run(
          supabase.from('challenges')
            .select('*')
            .eq('user_id', userId)
            .eq('date', date)
            .maybeSingle()
        )
      );
    },

    async upsert(userId, date, data) {
      await requireAuth();
      cache.invalidate(userId, 'challenges');  // bust so next getToday re-fetches
      return run(
        supabase.from('challenges')
          .upsert({ ...data, user_id: userId, date }, { onConflict: 'user_id,date' })
          .select()
          .maybeSingle()
      );
    },
  },

  // ── Check-ins ─────────────────────────────────────────────────────────────
  //
  // When to call: user opens the end-of-day check-in widget.
  // NOT cached — check-in state can change within the same calendar day.

  checkins: {
    async get(userId, date) {
      await requireAuth();
      return run(
        supabase.from('checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .single()
      );
    },

    async upsert(userId, date, data) {
      await requireAuth();
      return run(
        supabase.from('checkins')
          .upsert({ ...data, user_id: userId, date }, { onConflict: 'user_id,date' })
          .select()
          .single()
      );
    },
  },

  // ── Badges ────────────────────────────────────────────────────────────────
  //
  // When to call: user navigates to the Rewards tab.
  // .add() is also called internally after certain achievements; it
  // invalidates the cache so the tab reflects the new badge on next open.

  badges: {
    async getAll(userId) {
      await requireAuth();
      return cache.get(userId, 'user_badges', () =>
        run(
          supabase.from('user_badges')
            .select('*')
            .eq('user_id', userId)
            .order('earned_at')
        )
      );
    },

    async add(userId, badgeId) {
      await requireAuth();
      cache.invalidate(userId, 'user_badges');
      return run(
        supabase.from('user_badges')
          .upsert(
            { user_id: userId, badge_id: badgeId, earned_at: new Date().toISOString() },
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
          )
          .select()
          .maybeSingle()
      );
    },
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  //
  // When to call: user opens a quiz for a specific subject.
  // Cache key is per-subject so multiple subjects don't collide.

  quiz: {
    async getBySubject(userId, subjectId) {
      await requireAuth();
      const k = `quiz_progress:${userId}:${subjectId}`;
      if (!_cache.has(k)) {
        _cache.set(k, run(
          supabase.from('quiz_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('subject_id', subjectId)
            .single()
        ));
      }
      return _cache.get(k);
    },

    async upsert(userId, subjectId, data) {
      await requireAuth();
      _cache.delete(`quiz_progress:${userId}:${subjectId}`);
      return run(
        supabase.from('quiz_progress')
          .upsert(
            { ...data, user_id: userId, subject_id: subjectId, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,subject_id' }
          )
          .select()
          .single()
      );
    },
  },

};

// ─── Expose to non-module scripts ────────────────────────────────────────────
window.DB       = DB;
window.supabase = supabase;