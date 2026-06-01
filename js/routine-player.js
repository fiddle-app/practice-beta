'use strict';

// =================================================
// ROUTINE PLAYER — chunk sequencer + per-chunk overrides
// =================================================
// Drives timer.js chunk-by-chunk through a routine.
// timer.js calls getDur(key) instead of settings[key] directly,
// so this module can shadow individual duration values per chunk.

let _activeRoutine   = null;
let _activeChunk     = null;   // {subject, goal, strategy, retrospectiveQ, ...}
let _chunkSequence   = [];     // array of chunk indices in play order
let _sequenceIndex   = 0;
let _chunkOverrides  = {};     // keys: chunkDur, workDur, breakDur, restDur

// Called by timer.js instead of settings[key] directly
function getDur(key) {
  return (_chunkOverrides[key] !== undefined) ? _chunkOverrides[key] : settings[key];
}

// Called by render.js to get current chunk metadata
function getActiveChunk() {
  return _activeChunk;
}

function getActiveRoutine() {
  return _activeRoutine;
}

function clearActiveRoutine() {
  _activeRoutine  = null;
  _activeChunk    = null;
  _chunkSequence  = [];
  _sequenceIndex  = 0;
  _chunkOverrides = {};
}

function _buildSequence(routine) {
  const indices = routine.chunks.map((_, i) => i);
  if (routine.order === 'sequential') return indices;
  // Fisher-Yates shuffle
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
  _chunkSequence  = _buildSequence(routine);
  _sequenceIndex  = 0;
  nextChunk(); // arms overrides + _activeChunk for the first chunk
  // timer is already at 'ready' phase; render() will pick up _activeChunk
  // on the next RAF frame and show the chunk info on the start screen.
}
