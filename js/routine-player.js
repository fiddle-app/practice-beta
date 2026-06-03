'use strict';

// =================================================
// ROUTINE PLAYER — chunk sequencer + per-chunk overrides
// =================================================
// Drives timer.js chunk-by-chunk through a routine.
// timer.js calls getDur(key) instead of settings[key] directly,
// so this module can shadow individual duration values per chunk.

let _activeRoutine    = null;
let _activeChunk      = null;   // {subject, goal, strategy, retrospectiveQ, ...}
let _chunkSequence    = [];     // array of chunk indices in play order
let _sequenceIndex    = 0;
let _chunkOverrides   = {};     // per-chunk: chunkDur, workDur, breakDur, restDur
let _routineOverrides = {};     // routine-wide: workDur, breakDur, restDur

// Called by timer.js instead of settings[key] directly. Precedence (most specific
// first): this chunk's positional time → the routine's global override → the
// user's settings default.
function getDur(key) {
  if (_chunkOverrides[key]   !== undefined) return _chunkOverrides[key];
  if (_routineOverrides[key] !== undefined) return _routineOverrides[key];
  return settings[key];
}

// Called by render.js to get current chunk metadata
function getActiveChunk() {
  return _activeChunk;
}

function getActiveRoutine() {
  return _activeRoutine;
}

// Position of the currently-armed chunk within the play sequence. _sequenceIndex
// is incremented when a chunk is armed (see nextChunk), so it is 1 for the first
// chunk and equals _chunkSequence.length for the last. Used by render.js to show
// a routine's Overall Goal only on the first chunk's ready screen and its Overall
// Retrospective only on the final rest.
function isFirstChunkActive() {
  return !!_activeRoutine && _sequenceIndex === 1;
}
// True while the LAST chunk is the armed chunk — i.e. its ready screen, work,
// break, AND the final rest after it. render.js only consults it on the rest
// screen, where it uniquely identifies the routine's final rest.
function isLastChunkActive() {
  return !!_activeRoutine && _chunkSequence.length > 0 && _sequenceIndex === _chunkSequence.length;
}

function clearActiveRoutine() {
  _activeRoutine    = null;
  _activeChunk      = null;
  _chunkSequence    = [];
  _sequenceIndex    = 0;
  _chunkOverrides   = {};
  _routineOverrides = {};
}

function _buildSequence(routine) {
  const indices = routine.chunks.map((_, i) => i);
  if (routine.order !== 'random') return indices;
  // Fisher-Yates shuffle — each chunk plays exactly once, in random order
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function _applyChunkOverrides(chunk) {
  _activeChunk    = chunk;
  _chunkOverrides = {};
  if (chunk.chunkTime    !== null) _chunkOverrides.chunkDur  = chunk.chunkTime;
  if (chunk.practiceTime !== null) _chunkOverrides.workDur   = chunk.practiceTime;
  if (chunk.microbreakTime !== null) _chunkOverrides.breakDur = chunk.microbreakTime;
  if (chunk.restTime     !== null) _chunkOverrides.restDur   = chunk.restTime;
}

// Called by _advance() in timer.js at the end of rest-count, and by
// startRoutine() for the first chunk. Sets up the next chunk's overrides
// and metadata so the start/ready screen shows the upcoming chunk's info
// before the user taps to begin. Always returns void — _advance() always
// transitions to 'ready', which is where the chunk info is displayed.
// If the routine is complete, clears state and opens the selector.
function nextChunk() {
  if (!_activeRoutine) return;

  if (_sequenceIndex >= _chunkSequence.length) {
    // Routine complete — clean state, let timer go to ready, then open selector
    clearActiveRoutine();
    requestAnimationFrame(() => openRoutineSelector());
    return;
  }

  const chunkIdx = _chunkSequence[_sequenceIndex++];
  const chunk    = _activeRoutine.chunks[chunkIdx];
  _applyChunkOverrides(chunk);
  // Do NOT call startChunk() here — let timer.js call _enterPhase('ready'),
  // so the user sees the start screen with this chunk's info before tapping Start.
}

// Entry point: called when user selects a routine from the selector modal
function startRoutine(routine) {
  _activeRoutine  = routine;
  // Routine-wide time overrides (null = inherit settings). Only include the keys
  // the routine actually sets, so getDur falls through to settings for the rest.
  _routineOverrides = {};
  if (routine.workDur  != null) _routineOverrides.workDur  = routine.workDur;
  if (routine.breakDur != null) _routineOverrides.breakDur = routine.breakDur;
  if (routine.restDur  != null) _routineOverrides.restDur  = routine.restDur;
  _chunkSequence  = _buildSequence(routine);
  _sequenceIndex  = 0;
  nextChunk(); // arms overrides + _activeChunk for the first chunk
  // Render NOW. The timer is already at 'ready', and the tick() RAF loop does
  // NOT render during the ready phase (timer.js returns early before its render
  // calls), so without this the freshly-armed _activeChunk never reaches the
  // start screen — the chunk-info block stays hidden. (Inter-chunk transitions
  // are fine: those go through _advance()→_enterPhase('ready'), which renders.)
  if (typeof render === 'function') render();
}
