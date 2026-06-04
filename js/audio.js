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
// clipping at the DEFAULT volume slider (notifyVol 0.35 → 1.0x multiplier): the
// hottest single sound is the final gong (0.42 base → 0.42*2.3 = 0.97, just under
// 1.0). Above default the user's own slider can clip the gong regardless — the real
// headroom fix there is a master-bus limiter (would also let this go higher), but
// that means rerouting masterGain→destination in shared audio-ctx.js, deferred while
// that file is frozen (backlog C14). Raised 2.0→2.3 on 2026-06-03 per Casey ("bells
// a little louder").
const SPEAKERPHONE_BOOST = 2.3;
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
  // While the review overlay is open we deliberately give up the mic. With the
  // mic held the session is 'play-and-record', which pins output to iOS's quiet
  // speakerphone rail — review playback comes out ducked to near-inaudible no
  // matter how hot the decoded buffer is. Returning false here drops the session
  // to 'playback' (loud media rail). openReview() releases the mic; closeReview()
  // re-acquires it within the close-button gesture. (reviewOpen lives in ui.js;
  // cross-script global, guarded for shared-module safety.)
  if (typeof reviewOpen !== 'undefined' && reviewOpen) return false;
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

// =================================================
// iOS FIRST-ACQUIRE ROUTE-HEAL  (EXPERIMENT — 2026-06-03)
// =================================================
// WebKit bug 218012: the FIRST mic acquisition of a page load leaves WebAudio
// output ducked to iOS's quiet earpiece/speakerphone route. Casey observed
// (2026-06-03, PWA on iPhone) that launching with voice control on is near-
// silent until a recording is reviewed (mic released → 'playback') and dismissed
// (mic re-acquired → 'play-and-record') — after that round-trip everything is
// loud for the rest of the session. So we perform that exact cycle ONCE,
// automatically, right after the first acquire while still on the ready screen.
// It mirrors openReview()/closeReview() (ui.js): vcStop → releaseMic → dwell on
// the 'playback' rail → acquireMic → vcStart.
//
// Scope/safety:
//   • Gated to iOS (navigator.audioSession present) — desktop browsers never
//     have the route bug and the hook no-ops there.
//   • Gated to voice-on launches AND phase === 'ready'. That guarantees the
//     first acquire is the at-launch voice grab (before any MediaRecorder is
//     running), so releaseMic() can NEVER truncate a live recording. _runMicRouteHeal
//     re-checks phase and bails if the user has already pressed Start.
//   • One-shot per page load. Healing once fixes the route for the whole session
//     (same as the review round-trip does today).
//   • The close chime that accompanies a real review ('G4 → C4', closeReview)
//     is deliberately NOT replayed — the heal is silent.
//
// Permission note: the re-acquire is gesture-less. iOS grants getUserMedia per
// page session, so re-acquiring moments after a successful grant should not
// re-prompt — but this is iOS, so it's device-test-gated. If it ever re-prompts
// or disrupts voice, flip _MIC_ROUTE_HEAL to false.
const _MIC_ROUTE_HEAL          = true;   // experiment master switch
const _MIC_ROUTE_HEAL_KICK_MS  = 200;    // let voice reach 'listening' + clear the acquire call stack
const _MIC_ROUTE_HEAL_DWELL_MS = 450;    // dwell on the 'playback' rail so iOS re-negotiates the output route
let   _micRouteHealed          = false;  // one-shot per page load

// Shared-mic onMicAcquired hook (see _shared/js/mic.js). Fires after every
// successful acquire; we act at most once.
function onMicAcquired() {
  if (!_MIC_ROUTE_HEAL || _micRouteHealed) return;
  if (!navigator.audioSession) return;                       // iOS-only quirk
  if (typeof phase !== 'undefined' && phase !== 'ready') return; // only heal at launch/ready
  const _voiceOn = settings.voiceCommands &&
    !(typeof isVoiceSessionSuppressed === 'function' && isVoiceSessionSuppressed());
  if (!_voiceOn) return;                                      // scopes to the at-launch voice grab
  _micRouteHealed = true;  // claim the one-shot up front so the re-acquire below can't re-arm it
  console.log('[mic] route-heal: scheduling one-shot off/on cycle (experiment)');
  setTimeout(_runMicRouteHeal, _MIC_ROUTE_HEAL_KICK_MS);
}

function _runMicRouteHeal() {
  if (typeof phase !== 'undefined' && phase !== 'ready') {
    console.log('[mic] route-heal: skipped — left ready before cycle');
    return;
  }
  if (!micStream) {
    console.log('[mic] route-heal: skipped — no live mic');
    return;
  }
  console.log('[mic] route-heal: mic OFF (release → playback rail)');
  if (typeof vcStop === 'function') vcStop();
  if (typeof releaseMic === 'function') releaseMic();        // session → 'playback', loud media rail
  // Dwell on 'playback' so iOS actions the route change, then re-acquire.
  setTimeout(() => {
    if (typeof phase !== 'undefined' && phase !== 'ready') {
      console.log('[mic] route-heal: aborted mid-cycle — left ready');
      return;
    }
    if (typeof acquireMic !== 'function') return;
    acquireMic().then(() => {
      console.log('[mic] route-heal: mic ON (re-acquired → play-and-record)');
      const _voiceOk = settings.voiceCommands &&
        !(typeof isVoiceSessionSuppressed === 'function' && isVoiceSessionSuppressed());
      if (_voiceOk && typeof vcStart === 'function') {
        // vcStart resolves false if the recognizer didn't reach 'listening'. A heal
        // that restored the mic but left voice dead is the worst silent outcome —
        // surface it. (Recovery still happens on the next gesture/phase-change vcStart.)
        Promise.resolve(vcStart()).then(ok => {
          if (!ok) console.warn('[mic] route-heal: voice did NOT restart after re-acquire');
        });
      }
    }).catch(err => console.warn('[mic] route-heal re-acquire failed:', err));
  }, _MIC_ROUTE_HEAL_DWELL_MS);
}
