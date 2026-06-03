'use strict';

// =================================================
// DOM REFS & RENDER
// =================================================
const $ = id => document.getElementById(id);

const elApp          = $('app');
const elPhaseLabel   = $('phase-label');
const elProgressSec  = $('progress-section');
const elMacroBar     = $('macro-bar');
const elTimeProgress = $('time-progress');
const elRestQ        = $('rest-questions');
const elRestReport   = $('rest-report');
const elRoundCtr     = $('round-counter');
const elRingFg       = $('ring-fg');
const elTimeDisplay  = $('time-display');
const elReadyRing    = $('ready-ring-text');
const elControls     = $('controls');
const elStartBtn     = $('start-btn');
const elReviewBtn    = $('review-btn');
const elIconPlay     = $('pp-icon-play');
const elIconPause    = $('pp-icon-pause');

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return Math.floor(s/60) + ':' + (s%60).toString().padStart(2,'0');
}
function fmtF(sec) {
  const s = Math.max(0, Math.floor(sec));
  return Math.floor(s/60) + ':' + (s%60).toString().padStart(2,'0');
}

function render() {
  if (welcomeIsOpen) return;

  const isReady = phase === 'ready';
  const isRest  = phase === 'rest-count';
  const isWork  = phase === 'work';
  const isBreak = phase === 'break';
  const inChunk = isWork || isBreak;

  // Background — values mirror design tokens: --color-orange / --color-blue-break / --color-bg-surface
  //              edge: --color-orange-edge / --color-blue-break-dark / --color-bg-dark
  const bg     = isWork ? '#b83c08' : isBreak ? '#141560' : '#1e1e1e';
  const bgEdge = isWork ? '#4d1903' : isBreak ? '#080928' : '#0d0d0d';
  elApp.style.backgroundColor = bg;
  if (!$('review-overlay').classList.contains('open') && !$('settings-overlay').classList.contains('open')) {
    $('bg-fill').style.backgroundColor = bgEdge;
    document.body.style.backgroundColor = bgEdge;
    document.documentElement.style.backgroundColor = bgEdge;
    $('meta-theme').setAttribute('content', bgEdge);
  }

  // Phase label
  elPhaseLabel.textContent =
    isReady ? '' : isRest ? 'Rest' : isWork ? 'Practice' : 'Micro-break';

  // Progress bar
  elProgressSec.style.visibility = inChunk ? 'visible' : 'hidden';
  if (inChunk) {
    const C  = getDur('chunkDur');
    const pt = practiceTime;

    // Layered single bar: white → black → yellow as overage grows
    const elOvBlack  = $('overage-bar-black');
    const elOvYellow = $('overage-bar-yellow');
    if (pt <= C) {
      elMacroBar.style.width  = (pt / C * 100).toFixed(1) + '%';
      elOvBlack.style.width   = '0%';
      elOvYellow.style.width  = '0%';
    } else if (pt <= 2 * C) {
      elMacroBar.style.width  = '100%';
      elOvBlack.style.width   = ((pt - C) / C * 100).toFixed(1) + '%';
      elOvYellow.style.width  = '0%';
    } else {
      elMacroBar.style.width  = '100%';
      elOvBlack.style.width   = '100%';
      elOvYellow.style.width  = Math.min(100, (pt - 2*C) / C * 100).toFixed(1) + '%';
    }

    // Text: practiceTime of chunkDur
    elTimeProgress.innerHTML = '<strong>' + fmtF(pt) + '</strong> of ' + fmt(C);
  }

  // Chunk info (subject / goal / strategy) — shown when in a routine
  const activeChunk  = (typeof getActiveChunk === 'function') ? getActiveChunk() : null;
  const showChunkInfo = !!(activeChunk && (isWork || isBreak || isReady));
  $('chunk-info').style.display = showChunkInfo ? 'flex' : 'none';
  if (showChunkInfo) {
    $('chunk-subject').textContent  = activeChunk.subject  || '';
    $('chunk-goal').textContent     = activeChunk.goal     || '';
    $('chunk-goal').style.display   = activeChunk.goal     ? '' : 'none';
    $('chunk-strategy').textContent = activeChunk.strategy || '';
    $('chunk-strategy').style.display = activeChunk.strategy ? '' : 'none';
  }

  // Reflective prompts (#rest-questions, the warm/orange text). Shown on the
  // READY screen (opening prompts, coexisting above chunk-info in #mid-zone) and
  // on the REST screen (closing prompts). Hidden on work/break.
  //
  // A routine may define whole-routine prompts that override the generic ones:
  //   - Overall Goal replaces the opening questions and shows ONLY on the first
  //     chunk's ready screen; later chunks' ready screens then show no prompts.
  //   - Overall Retrospective replaces the closing questions and shows ONLY on
  //     the final rest (after the last chunk); earlier rests show no prompts.
  // So a routine with both shows the warm prompts exactly twice — the overall
  // goal at the very start and the overall retrospective at the very end.
  const activeRoutine = (typeof getActiveRoutine === 'function') ? getActiveRoutine() : null;
  const overallGoal   = activeRoutine && activeRoutine.overallGoal;
  const overallRetro  = activeRoutine && activeRoutine.overallRetrospective;
  const onFirstChunk  = (typeof isFirstChunkActive === 'function') && isFirstChunkActive();
  const onLastChunk   = (typeof isLastChunkActive  === 'function') && isLastChunkActive();

  let restQLines = null; // null → hide #rest-questions entirely
  if (isReady) {
    if (overallGoal) restQLines = onFirstChunk ? [overallGoal] : null;
    else             restQLines = settings.restQ || ['', '', ''];
  } else if (isRest) {
    if (overallRetro) {
      restQLines = onLastChunk ? [overallRetro] : null;
    } else if (activeChunk && activeChunk.retrospectiveQ) {
      const closeQs = settings.restQClose || ['', ''];
      restQLines = [activeChunk.retrospectiveQ, closeQs[1] || '', ''];
    } else {
      restQLines = (settings.restQClose || ['', '']).concat(['']);
    }
  }

  if (restQLines) {
    elRestQ.style.display = 'flex';
    const ps = elRestQ.querySelectorAll('p');
    for (let i = 0; i < 3; i++) {
      if (ps[i]) {
        const txt = restQLines[i] || '';
        ps[i].textContent = txt;
        ps[i].style.display = txt ? '' : 'none';
      }
    }
  } else {
    elRestQ.style.display = 'none';
  }

  // Chunk summary (shown on ready screen after first chunk completes)
  const showSummary = isReady && lastChunkDur > 0;
  $('chunk-summary').style.display = showSummary ? 'block' : 'none';
  if (showSummary) {
    let html = 'Previous chunk: <strong>' + fmtF(lastPracticeTime) + '</strong> of ' + fmt(lastChunkDur);
    if (!settings.breaksCountAsPractice) {
      html += '<br>Elapsed time: ' + fmtF(lastChunkElapsed);
    }
    $('chunk-summary').innerHTML = html;
  }

  // Round counter — single line when chunk-info is present to save vertical space
  elRoundCtr.textContent = inChunk ? 'Round ' + (currentRound + 1) : '';

  // Ring visibility
  const ringOpacity = isReady ? '0' : '1';
  $('ring-bg').style.opacity = ringOpacity;
  elRingFg.style.opacity     = ringOpacity;

  // Ring time display vs "ready" text
  // In waitingToAdvance state, show "ready" instead of time
  const showReady = isReady || waitingToAdvance;
  elTimeDisplay.style.display = (!showReady && (isWork || isBreak || isRest)) ? 'block' : 'none';
  elReadyRing.style.display   = showReady ? 'block' : 'none';
  $('ring-wrap').classList.toggle('ring-start-ready', isReady);
  elReadyRing.textContent     = waitingToAdvance
    ? (practiceTime >= 3 * getDur('chunkDur') ? 'Asleep?' : (phase === 'break' ? 'Ready?' : 'Done?'))
    : 'Ready?';
  // Also show the ring strokes when waitingToAdvance (they're hidden in isReady)
  if (waitingToAdvance) {
    $('ring-bg').style.opacity = '1';
    elRingFg.style.opacity     = '1';
  }

  if (!showReady && (isWork || isBreak || isRest)) {
    const total  = isWork ? getDur('workDur') : isBreak ? getDur('breakDur') : getDur('restDur');
    const frac   = total > 0 ? phaseTimeLeft / total : 0;
    elRingFg.style.strokeDashoffset =
      (RING_C * (1 - Math.min(1, Math.max(0, frac)))).toFixed(3);
    elTimeDisplay.textContent = fmt(phaseTimeLeft);
  }
  if (waitingToAdvance) {
    // Ring fully depleted
    elRingFg.style.strokeDashoffset = RING_C.toFixed(3);
  }

  // Rest report (below ring, in review-slot area)
  const showReport = isRest && lastChunkDur > 0;
  elRestReport.style.display = showReport ? 'block' : 'none';
  if (showReport) {
    elRestReport.innerHTML =
      'Last chunk: ' + fmt(lastChunkDur) + '<br>' +
      fmtF(lastPracticeTime) + ' practice time<br>' +
      fmtF(lastChunkElapsed) + ' clock time';
  }

  // Controls vs Start button
  if (isReady) {
    elControls.style.display = 'none';
    elStartBtn.style.display = 'flex';
  } else {
    elControls.style.display = 'flex';
    elStartBtn.style.display = 'none';
  }

  // Play/pause icon — show play when paused OR waiting to advance
  const showPlay = isPaused || isReady || waitingToAdvance;
  elIconPlay.style.display  = showPlay ? 'block' : 'none';
  elIconPause.style.display = showPlay ? 'none'  : 'block';

  // Review button
  elReviewBtn.style.display = (settings.recording && isBreak && reviewBlob) ? 'flex' : 'none';

  // Close / info buttons
  const hideClose = isReady || isRest;
  $('close-btn').style.opacity       = hideClose ? '0' : '1';
  $('close-btn').style.pointerEvents = hideClose ? 'none' : 'auto';
  const showInfo = isReady || isRest;
  $('info-btn').style.opacity       = showInfo ? '1' : '0';
  $('info-btn').style.pointerEvents = showInfo ? 'auto' : 'none';

  // Plan back button — ready screen only, when routines are enabled
  const planBack = $('plan-back-btn');
  if (planBack) planBack.style.display = (isReady && settings.routinesEnabled) ? 'flex' : 'none';

  // Repetition counter visibility (work-phase only, hidden under overlays)
  if (typeof rcUpdateVisibility === 'function') rcUpdateVisibility();
}
