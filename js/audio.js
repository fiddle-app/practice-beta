'use strict';

// =================================================
// AUDIO ENGINE — app-specific synth functions
// Depends on: audioCtx, audioUnlocked, masterGain (audio-ctx.js)
//             settings (settings.js)
// =================================================

// Speakerphone-rail loudness compensation. When the app wants the mic (recording
// or voice commands), iOS pins output to the quiet speakerphone volume rail, AND
// we've disabled iOS's voice-processing output boost to keep recordings clean
// (mic-recording.js). Both make output quiet, and a PWA can't touch the hardware
// rail — so we compensate in software by boosting masterGain. Off that rail (no
// mic wanted → media rail) output is already loud, so no boost (2x there could
// clip). Gated on appWantsMic() rather than the live mic so it's stable across the
// session and also covers voice-only (mic live, recording off). Bounded by digital
// clipping: bell base gains (0.28–0.42) stay under 1.0 at 2x; if overlapping sounds
// ever clip audibly, add a master-bus limiter.
const SPEAKERPHONE_BOOST = 2.0;
function _railBoost() {
  return (typeof appWantsMic === 'function' && appWantsMic()) ? SPEAKERPHONE_BOOST : 1.0;
}

// Resolver consumed by _shared/js/audio-ctx.js. Returns the master-gain value used
// by ensureAudio and unmuteMasterGain, and by updateMasterGain (settings-driven
// writes) so boot and slider writes resolve identically — no boot-vs-write
// asymmetry. Includes the speakerphone-rail boost above; notifyVol is the user's
// tweak on top of it.
function getMasterGainForSettings() {
  return ((parseFloat(settings.notifyVol) || 0.35) / 0.35) * _railBoost();
}

// Resolver consumed by _shared/js/audio-ctx.js (ensureAudio) and
// _shared/js/mic.js (releaseMic). Returns true when the app needs mic
// access — drives the dynamic audio-session category. Microbreaker
// needs mic when recording is enabled, or when voice commands are
// enabled AND not suppressed for this session ("No thanks" at launch).
// Without either, returning false lets the shared module use
// 'playback' category, which routes output through Bluetooth A2DP /
// car stereo / AirPlay (the routing 'play-and-record' blocks).
function appWantsMic() {
  const voiceActive = settings.voiceCommands &&
    !(typeof isVoiceSessionSuppressed === 'function' && isVoiceSessionSuppressed());
  return !!(settings.recording || voiceActive);
}

function updateMasterGain() {
  if (masterGain) {
    // Mirror the boot resolver EXACTLY. Previously this applied an extra
    // 0.8x (-1.9 dB) headroom haircut that the boot path lacked, so the app
    // got ~20% quieter the moment the user first touched the volume slider
    // and stayed there. That global cut was almost certainly a clipping
    // guard for overlapping/loud notification sounds — removed 2026-06-02
    // per Casey. If overlap clipping resurfaces at max volume, fix it with
    // a limiter or lower per-sound gains, not a global haircut that also
    // kills normal loudness.
    masterGain.gain.value = getMasterGainForSettings();
  }
}

function beep(freq, dur, gain, type, delay) {
  if (!audioUnlocked) return;
  if ((parseFloat(settings.notifyVol) || 0) === 0) return;
  const ctx = audioCtx;
  const t = ctx.currentTime + (delay || 0);
  const g = ctx.createGain();
  const o = ctx.createOscillator();
  o.type = type || 'sine';
  o.frequency.value = freq;
  // Per-note gain envelope — masterGain handles overall volume scaling
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain || 0.32, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(masterGain || ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function playCountdownBeep(n) { beep(n === 1 ? 1047 : 880, 0.40, 0.28); } // 880=A5, 1047=C6

function playWorkStart() {
  // Boxing ring bell: A5 (880Hz), single strike, 2.5s decay
  const freq = 880; // A5 (boxing bell fundamental)
  const dur  = 2.5;
  const gain = 0.12; // fundamental gain
  const delay = 0;
  [1, 2.756, 5.404, 8.933].forEach((ratio, i) => {
    const t = audioCtx.currentTime + delay;
    const g = audioCtx.createGain();
    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * ratio;
    const partialGain = gain * [1, 0.5, 0.25, 0.12][i];
    const partialDur  = dur  * [1, 0.7, 0.5,  0.3][i];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(partialGain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + partialDur);
    o.connect(g); g.connect(masterGain || audioCtx.destination);
    o.start(t); o.stop(t + partialDur + 0.05);
  });
}

function playBreakStart() {
  // Single C3 tone, fading out over 3s
  beep(130.8, 3.0, 0.35, 'sine', 0.0); // C3
}

function playAsleepDing() {
  // Single quiet C5 ding — plays when autoAdvance=off and practice time exceeds chunk budget
  beep(523.3, 2.0, 0.25, 'sine', 0.0); // C5
}

function playFinalGong() {
  // Same as break chime (C3) but twice as long and 20% louder
  beep(130.8, 6.0, 0.42, 'sine', 0.0); // C3, 6s decay, gain 0.42
}

function playBackToWork() {
  // High chime: C4, 8.0s decay, gain 0.30
  beep(261.6, 3.0, 0.30, 'sine', 0.0); // C4
}
