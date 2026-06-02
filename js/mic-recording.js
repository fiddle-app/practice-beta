'use strict';

// =================================================
// MIC RECORDING — microbreaker
// -----------------------------------------------------------------
// MediaRecorder wiring on top of the shared mic stream (js/mic.js,
// synced from _shared/js/mic.js). Owns the recording-blob lifecycle:
// chunk accumulation, blob assembly, cap timer, memory snapshot at
// release.
//
// Globals consumed:
//   micStream, acquireMic, onMicWillRelease  (js/mic.js)
//   audioCtx, audioUnlocked                  (js/audio-ctx.js)
//   playWorkStart, phase, settings           (other modules)
//   render                                   (ui.js)
// Globals exposed:
//   mediaRecorder, reviewBlob
//   startRecording, stopRecording, pauseRecording, resumeRecording
//   clearReviewBlob
// =================================================

let mediaRecorder = null;
let recChunks     = [];
let reviewBlob    = null;
let recCapTimer   = null;
let recPendingTimer = null;
let _recGeneration  = 0; // incremented on every startRecording; stale async paths bail
let _recSrcNode    = null; // Web Audio bypass source node — disconnected on stop

// Delay between the round-start bell firing and the MediaRecorder actually
// starting. The bell (playWorkStart) is A5 with a 2.5s exponential decay,
// but at 500 ms its amplitude is already well below typical fiddle mic
// input — the previous 2000 ms swallowed real opening notes Casey wanted
// captured. Bell tail still appears in recordings but as a low-level
// transient, which is acceptable.
const RECORD_START_DELAY_MS = 500;

// Software gain applied on the recording path, inside the Web Audio bypass
// (createMediaStreamSource → gain → MediaStreamDestination). iOS delivers the
// fiddle ~13 dB below full scale; measured 2026-06-01 off the review-screen
// waveform, the loudest bow strokes sat at ~0.22 of full scale (peaks filling
// only ~20% of the half-band). The boost is user-controlled via settings.recBoost
// (a percentage — 400 = 4.0× = +12 dB, the default, which lands those peaks
// near 0.9 / −1 dBFS). Read fresh at each recording start so the review-screen
// slider applies to the NEXT round. The gain multiplies signal AND noise floor
// equally — it cures quietness, not the scratch. 100% = passthrough.
function _recGainMult() {
  const pct = parseFloat(settings.recBoost);
  return (isNaN(pct) ? 400 : pct) / 100;
}

// Retroactively strip iOS voice processing (noiseSuppression / autoGainControl /
// echoCancellation) from the LIVE mic track, for clean fiddle capture. iOS applies
// these by default at the getUserMedia layer, and shared mic.js requests plain
// `audio: true` — changing THAT request would be a _shared edit affecting ear-tuner.
// So instead we re-negotiate the already-acquired track in place via applyConstraints:
// a separate, microbreaker-local call on the track object; shared's getUserMedia is
// untouched.
//
// CAVEAT (the whole reason this is an experiment): iOS Safari honors these flags via
// applyConstraints INCONSISTENTLY — the track was built with iOS's voice-processing
// audio unit and applyConstraints may not swap it out. The getSettings() readback
// below is the diagnostic: if it logs ns=false the OS accepted it; if the NS gating
// still chops sustained fiddle notes, iOS ignored it and the only remaining fix is the
// constraint at getUserMedia time (a _shared change via an appMicConstraints() hook).
//
// Scope: there is ONE shared mic track, also used by voice commands — so while a
// recording session is active, voice recognition runs without noise suppression too.
// Fire-and-forget: the RECORD_START_DELAY_MS gap before _beginRec covers the
// renegotiation, and the constraints persist on the track for the ongoing capture.
//
// _sessType() reads the iOS audio-session category we last set (what
// navigator.audioSession reports — NOT the hardware volume rail, which iOS does
// not expose to JS). Diagnostic only, for the rail investigation.
function _sessType() {
  try { return (navigator.audioSession && navigator.audioSession.type) || 'n/a'; }
  catch (_) { return 'err'; }
}

async function _applyRecordingConstraints() {
  if (!micStream) return;
  const track = micStream.getAudioTracks()[0];
  if (!track || typeof track.applyConstraints !== 'function') return;
  console.log('[rec] session pre-constraints type=' + _sessType());
  try {
    await track.applyConstraints({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    const s = (typeof track.getSettings === 'function') ? track.getSettings() : {};
    console.log('[rec] applyConstraints ok — readback ns=' + s.noiseSuppression +
                ' agc=' + s.autoGainControl + ' ec=' + s.echoCancellation +
                ' — session post-constraints type=' + _sessType());
  } catch (e) {
    console.warn('[rec] applyConstraints failed (iOS may ignore these):', e);
  }
}

// When the shared mic module is about to release the stream (e.g., the
// persistent-mute auto-release fires), we need to stop the recorder and
// clear our timers so the assembled blob is finalised cleanly. The shared
// module fires this listener BEFORE the tracks stop.
if (typeof onMicWillRelease === 'function') {
  onMicWillRelease(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    mediaRecorder = null;
    if (recPendingTimer) { clearTimeout(recPendingTimer); recPendingTimer = null; }
    if (recCapTimer)     { clearTimeout(recCapTimer);     recCapTimer     = null; }
  });
}

// Drop the current review blob. Call this at every transition where
// review is no longer reachable: the next round's startRecording (about
// to overwrite it), and break exit (review-btn is only shown during
// break, so once break ends the user can't reach it anyway). Idempotent
// and cheap; safe to call when there's no blob.
//
// Also logs a memory snapshot just BEFORE freeing — the moment immediately
// before release is the natural high-water-mark for the recording lifecycle.
// Captured via console.log so diag-log.js's wrapper persists it; visible
// later in Settings → Diagnostics → Error log. performance.memory is a
// Chrome-only API (Safari doesn't implement it), so on iPhone the entry
// reports the blob size but not heap — still useful as a "what was the
// peak recording size" signal across sessions.
//
// As of the Web Audio review refactor, there's no <audio> element / object
// URL to revoke here — review playback decodes through the AudioContext
// and the decoded buffer is freed by closeReview(). This helper now just
// nulls the blob.
function clearReviewBlob() {
  if (!reviewBlob) return;
  const blobMB = (reviewBlob.size / 1048576).toFixed(2);
  let heapInfo = 'heap=unavailable';
  if (typeof performance !== 'undefined' && performance.memory) {
    const m = performance.memory;
    heapInfo = 'heap=' + (m.usedJSHeapSize / 1048576).toFixed(1) +
               '/' + (m.totalJSHeapSize / 1048576).toFixed(1) +
               'MB (limit ' + (m.jsHeapSizeLimit / 1048576).toFixed(0) + 'MB)';
  }
  console.log('[mem] release recording: blob=' + blobMB + 'MB ' + heapInfo);
  reviewBlob = null;
}

function startRecording() {
  if (!settings.recording) return;
  recChunks = [];
  // Defensive — clearReviewBlob() runs at break exit too, so by the time
  // we get here reviewBlob should already be null. This catches the path
  // where startRecording is called WITHOUT going through break (e.g.,
  // restartPhase in timer.js calls stopRecording then startRecording for
  // the same work phase). The Web Audio review path's decoded buffer +
  // gain node are owned by ui.js's closeReview, not this module.
  clearReviewBlob();
  if (recPendingTimer) { clearTimeout(recPendingTimer); recPendingTimer = null; }
  const gen = ++_recGeneration;
  if (!micStream) {
    acquireMic().then(ok => {
      if (!ok || gen !== _recGeneration) return; // stale — another startRecording fired
      // Play bell after mic acquired — AudioContext is resumed by acquireMic
      if (audioUnlocked && phase === 'work') playWorkStart();
      _applyRecordingConstraints(); // strip iOS voice processing off the fresh track
      _scheduleBeginRec(gen);
    });
    return;
  }
  // mic already acquired — caller plays the bell synchronously before this.
  _applyRecordingConstraints(); // re-assert constraints on the existing track
  _scheduleBeginRec(gen);
}

function _scheduleBeginRec(gen) {
  recPendingTimer = setTimeout(() => {
    recPendingTimer = null;
    // User may have toggled recording off, paused, or skipped past the
    // work phase during the bell delay — bail rather than capture stale audio.
    if (!settings.recording || phase !== 'work' || gen !== _recGeneration) return;
    _beginRec();
  }, RECORD_START_DELAY_MS);
}

function _beginRec() {
  if (!micStream) { console.warn('_beginRec: no micStream'); return; }
  try {
    // Web Audio bypass: route the mic through the shared (generic) AudioContext
    // before recording, applying the software boost gain (_recGainMult). This is a
    // LEVEL stage ONLY — it does NOT remove iOS voice processing. NS/AGC/EC are
    // applied at capture (inside the getUserMedia audio unit), upstream of this
    // graph, so piping through Web Audio cannot un-suppress them; that job belongs
    // to _applyRecordingConstraints() (applyConstraints on the track, called before
    // we get here). Deliberately uses the generic audioCtx, not a dedicated
    // recording context — mic and app output share one context.
    let recStream = micStream;
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state !== 'closed') {
      try {
        _recSrcNode = audioCtx.createMediaStreamSource(micStream);
        const recGain = audioCtx.createGain();
        recGain.gain.value = _recGainMult();
        const dest  = audioCtx.createMediaStreamDestination();
        _recSrcNode.connect(recGain);
        recGain.connect(dest);
        recStream = dest.stream;
      } catch(e) {
        console.warn('[rec] web audio bypass failed, recording direct:', e);
        _recSrcNode = null;
      }
    }
    const mr = new MediaRecorder(recStream);
    mediaRecorder = mr;
    mr.ondataavailable = e => { if (e.data?.size > 0) recChunks.push(e.data); };
    mr.onstop = () => {
      if (recChunks.length) {
        reviewBlob = new Blob(recChunks, { type: mr.mimeType || 'audio/webm' });
        // Drop chunk references the moment the assembled blob exists.
        // Engines may keep the source blobs alive until the new Blob
        // finalises — clearing the array lets the old chunks be GC'd
        // immediately rather than living until the next round resets.
        recChunks = [];
        render();
      }
    };
    mr.start(250);
    console.log('[rec] session @ record-start type=' + _sessType());
    // Configurable cap (settings.maxRecDur, seconds). Fallback 600s
    // matches the prior hardcoded 10-minute behavior.
    const capSec = (settings.maxRecDur || 600);
    recCapTimer = setTimeout(() => stopRecording(), capSec * 1000);
  } catch(e) {
    console.warn('MediaRecorder start failed:', e);
  }
}

// Pause / resume the current MediaRecorder across visibility transitions.
// MediaRecorder.pause() suspends data collection without finalizing the
// blob; resume() picks back up and the assembled blob has a small skipped
// section (the duration the page was hidden) but no broken bytes. Caller
// is responsible for tracking whether a pause is "in flight" — these are
// thin wrappers; idempotent if the recorder is already in the target state.
function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try { mediaRecorder.pause(); } catch (e) {}
  }
}
function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    try { mediaRecorder.resume(); } catch (e) {}
  }
}

function stopRecording() {
  if (recCapTimer) { clearTimeout(recCapTimer); recCapTimer = null; }
  if (recPendingTimer) { clearTimeout(recPendingTimer); recPendingTimer = null; }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch(e) {}
  }
  mediaRecorder = null;
  if (_recSrcNode) { try { _recSrcNode.disconnect(); } catch(e) {} _recSrcNode = null; }
  // Keep micStream alive across phases on all browsers.
  // Previously we stopped tracks on Safari to clear the mic indicator, but
  // iOS can re-prompt for mic permission if the stream is released — even
  // within the same session, especially after long rest phases or the
  // 10-minute recording timeout. The mic indicator staying on is preferable
  // to interrupting the user with a permission dialog.
  // micStream intentionally NOT released here. See releaseMic() in
  // js/mic.js for the visibility-hidden teardown that DOES release the stream.
}
