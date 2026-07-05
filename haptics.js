/**
 * haptics.js — Haptic feedback for BoardOS
 *
 * Uses the Web Vibration API (navigator.vibrate).
 * Supported: Android Chrome and most Android browsers.
 * Silent no-op on iOS Safari and desktop — never throws.
 *
 * Plain classic script (NOT an ES module) — loaded via a normal
 * `<script src="haptics.js" defer></script>` tag, in document order
 * alongside app.js. This is intentional: mixing type="module" with
 * classic `defer` scripts does not give a spec-guaranteed execution
 * order between the two queues, which previously caused
 * window.hapticsVibrate to be undefined when app.js ran, silently
 * breaking session logging, chapter completion, streaks, etc.
 *
 * Usage:
 *   hapticsVibrate('success');
 *
 * Pattern array format: [on, off, on, off, ...] in milliseconds.
 */

// ─── Vibration patterns ──────────────────────────────────────────────────────

const PATTERNS = {
  // Two short taps — session logged, chapter done, revision done, exam logged, EOD check-in
  success:  [40, 30, 60],

  // Escalating three-tap — streak milestone, daily goal hit, onboarding complete
  streak:   [30, 20, 40, 20, 80],

  // Big celebration — level up, subject fully complete, badge unlocked
  levelUp:  [50, 40, 80, 40, 130],

  // Single light tap — task checked off, doubt cleared, freeze earned, pomodoro break→work
  light:    [25],

  // Two heavy pulses — quiz wrong answer, quiz timed out
  error:    [70, 50, 70],
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * vibrate(type)
 *
 * Fires a vibration pattern by name. Silent no-op on unsupported devices.
 * Falls back to 'light' for unrecognised type strings.
 * Never throws.
 *
 * @param {'success'|'streak'|'levelUp'|'light'|'error'} type
 */
function vibrate(type = 'light') {
  try {
    if (!navigator.vibrate) return; // iOS, desktop — silent skip
    navigator.vibrate(PATTERNS[type] ?? PATTERNS.light);
  } catch (e) {
    // Swallow — vibration is enhancement-only, never critical
  }
}

// Global used directly by app.js (classic script, not a module export).
window.hapticsVibrate = vibrate;