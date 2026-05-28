import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://lutkwbxjnzhctgtomran.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dGt3YnhqbnpoY3RndG9tcmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjQxNDgsImV4cCI6MjA5NDY0MDE0OH0.-AAKheuquEqnKRqMkVWPcHlq89FFbaaim7dbS2fbgRY'
);

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── DB ─────────────────────────────────────────────────────────────────────

export const DB = {

  // ── Auth ──────────────────────────────────────────────────────────────────

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
      return run(supabase.auth.signOut());
    },

    async getSession() {
      return run(supabase.auth.getSession());
    },

    async getUser() {
      return run(supabase.auth.getUser());
    },
  },

  // ── Profile ───────────────────────────────────────────────────────────────

  profile: {
    async get(userId) {
      return run(
        supabase.from('profiles').select('*').eq('user_id', userId).single()
      );
    },

    async update(userId, data) {
      return run(
        supabase.from('profiles').update(data).eq('user_id', userId).select().single()
      );
    },

    async createDefault(userId, name) {
      return run(
        supabase.from('profiles')
          .insert({ user_id: userId, name, created_at: new Date().toISOString() })
          .select()
          .single()
      );
    },
  },

  // ── Subjects ──────────────────────────────────────────────────────────────

  subjects: {
    async getAll(userId) {
      return run(
        supabase.from('subjects').select('*').eq('user_id', userId).order('created_at')
      );
    },

    async create(userId, subject) {
      return run(
        supabase.from('subjects')
          .insert({ ...subject, user_id: userId })
          .select()
          .single()
      );
    },

    async update(id, data) {
      return run(
        supabase.from('subjects').update(data).eq('id', id).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('subjects').delete().eq('id', id)
      );
    },
  },

  // ── Chapters ──────────────────────────────────────────────────────────────

  chapters: {
    async getBySubject(subjectId) {
      return run(
        supabase.from('chapters').select('*').eq('subject_id', subjectId).order('order_index')
      );
    },

    async create(chapter) {
      return run(
        supabase.from('chapters').insert(chapter).select().single()
      );
    },

    async update(id, data) {
      return run(
        supabase.from('chapters').update(data).eq('id', id).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('chapters').delete().eq('id', id)
      );
    },
  },

  // ── Sessions ──────────────────────────────────────────────────────────────

  sessions: {
    async getAll(userId) {
      return run(
        supabase.from('sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      );
    },

    async getByDate(userId, date) {
      // `date` is a local (IST) calendar date: "YYYY-MM-DD".
      // started_at is stored as UTC timestamptz. We must query the UTC range
      // that corresponds to the full IST calendar day, not the UTC calendar day.
      //
      // IST is UTC+05:30, so IST midnight = UTC 18:30 the *previous* day.
      //   IST day start: YYYY-MM-DDT00:00:00+05:30  →  (date-1)T18:30:00.000Z
      //   IST day end:   YYYY-MM-DDT23:59:59+05:30  →  (date)T18:29:59.999Z
      //
      // We compute this without relying on the runtime timezone so it works
      // correctly even if the server/browser is in a different locale.
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const dayStartIST = new Date(`${date}T00:00:00.000Z`).getTime() - IST_OFFSET_MS;
      const dayEndIST   = new Date(`${date}T23:59:59.999Z`).getTime() - IST_OFFSET_MS;
      const from = new Date(dayStartIST).toISOString();
      const to   = new Date(dayEndIST).toISOString();
      return run(
        supabase.from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at')
  );
},

    async create(session) {
      return run(
        supabase.from('sessions').insert(session).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('sessions').delete().eq('id', id)
      );
    },
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────

  tasks: {
    async getByDate(userId, date) {
      return run(
        supabase.from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .order('created_at')
      );
    },

    async create(task) {
      return run(
        supabase.from('tasks').insert(task).select().single()
      );
    },

    async update(id, data) {
      return run(
        supabase.from('tasks').update(data).eq('id', id).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('tasks').delete().eq('id', id)
      );
    },
  },

  // ── Doubts ────────────────────────────────────────────────────────────────

  doubts: {
    async getAll(userId) {
      return run(
        supabase.from('doubts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      );
    },

    async create(doubt) {
      return run(
        supabase.from('doubts').insert(doubt).select().single()
      );
    },

    async update(id, data) {
      return run(
        supabase.from('doubts').update(data).eq('id', id).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('doubts').delete().eq('id', id)
      );
    },
  },

  // ── Exam Scores ───────────────────────────────────────────────────────────

  examScores: {
    async getAll(userId) {
      return run(
        supabase.from('exam_scores').select('*').eq('user_id', userId).order('date', { ascending: false })
      );
    },

    async create(score) {
      return run(
        supabase.from('exam_scores').insert(score).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('exam_scores').delete().eq('id', id)
      );
    },
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  notes: {
    async getAll(userId) {
      return run(
        supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
      );
    },

    async create(note) {
      return run(
        supabase.from('notes').insert(note).select().single()
      );
    },

    async update(id, data) {
      return run(
        supabase.from('notes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('notes').delete().eq('id', id)
      );
    },
  },

  // ── Resources ─────────────────────────────────────────────────────────────

  resources: {
    async getAll(userId) {
      return run(
        supabase.from('resources').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      );
    },

    async create(resource) {
      return run(
        supabase.from('resources').insert(resource).select().single()
      );
    },

    async delete(id) {
      return run(
        supabase.from('resources').delete().eq('id', id)
      );
    },
  },

  // ── Challenges ────────────────────────────────────────────────────────────

  challenges: {
    async getToday(userId, date) {
      return run(
        supabase.from('challenges')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle()
      );
    },

    async upsert(userId, date, data) {
      return run(
        supabase.from('challenges')
          .upsert({ ...data, user_id: userId, date }, { onConflict: 'user_id,date' })
          .select()
          .maybeSingle()
      );
    },
  },

  // ── Check-ins ─────────────────────────────────────────────────────────────

  checkins: {
    async get(userId, date) {
      return run(
        supabase.from('checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .single()
      );
    },

    async upsert(userId, date, data) {
      return run(
        supabase.from('checkins')
          .upsert({ ...data, user_id: userId, date }, { onConflict: 'user_id,date' })
          .select()
          .single()
      );
    },
  },

  // ── Badges ────────────────────────────────────────────────────────────────

  badges: {
    async getAll(userId) {
      return run(
        supabase.from('user_badges').select('*').eq('user_id', userId).order('earned_at')
      );
    },

    async add(userId, badgeId) {
      return run(
        supabase.from('user_badges')
          .upsert(
            { user_id: userId, badge_id: badgeId, earned_at: new Date().toISOString() },
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
          )
          .select()
          .single()
      );
    },
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────

  quiz: {
    async getBySubject(userId, subjectId) {
      return run(
        supabase.from('quiz_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('subject_id', subjectId)
          .single()
      );
    },

    async upsert(userId, subjectId, data) {
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
// Expose to non-module scripts
window.DB = DB;
window.supabase = supabase;