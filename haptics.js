/**
 * haptics.js — Haptic feedback for BoardOS
 *
 * Uses the Web Vibration API (navigator.vibrate).
 * Supported: Android Chrome and most Android browsers.
 * Silent no-op on iOS Safari and desktop — never throws.
 *
 * Usage (ES module):
 *   import { vibrate } from './haptics.js';
 *   vibrate('success');
 *
 * Usage (non-module scripts via global):
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

// ─── Exported API ────────────────────────────────────────────────────────────

/**
 * vibrate(type)
 *
 * Fires a vibration pattern by name. Silent no-op on unsupported devices.
 * Falls back to 'light' for unrecognised type strings.
 * Never throws.
 *
 * @param {'success'|'streak'|'levelUp'|'light'|'error'} type
 */
export function vibrate(type = 'light') {
  try {
    if (!navigator.vibrate) return; // iOS, desktop — silent skip
    navigator.vibrate(PATTERNS[type] ?? PATTERNS.light);
  } catch (e) {
    // Swallow — vibration is enhancement-only, never critical
  }
}

// Expose on a namespaced global for non-module scripts (app.js uses hapticsVibrate)
window.hapticsVibrate = vibrate;