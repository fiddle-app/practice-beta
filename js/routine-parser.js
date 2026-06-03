'use strict';

// =================================================
// ROUTINE TEXT FORMAT PARSER
// =================================================
// Parses the user-facing text format into a routine object.
// Returns { routine, errors } where errors is an array of strings.
//
// Format:
//   Name: {name}
//   [Order: {Sequential | Random}]
//   [Overall Goal: {whole-routine goal, shown at the start}]
//   [Overall Retrospective: {whole-routine question, shown at the very end}]
//   [Practice Round: {time}]   — routine-wide override for the round length
//   [Microbreak: {time}]       — routine-wide override for the micro-break
//   [Rest: {time}]             — routine-wide override for the rest length
//   {chunkTime}[, {practiceTime}[, {microbreakTime}[, {restTime}]]] {subject}[; {goal}][; {strategy}][; {retrospectiveQ}]
//
// Header keywords (Name/Order/Overall Goal/Overall Retrospective/Practice Round/
// Microbreak/Rest) may appear in any order, anywhere among the lines; only their
// first occurrence is kept. The routine-level times override the user's global
// settings for this routine; a chunk's own positional time still wins over them.
//
// Times are POSITIONAL: chunkTime first, then optionally practiceTime,
// microbreakTime, restTime — each specifiable only if all earlier ones are. A
// null time inherits the global setting. Only chunkTime and subject are required.
// Time formats: M:SS  or  :SS  or  M (integer minutes)  or  decimal (e.g. 1.5 = 1:30)
// Blank lines and lines starting with # are ignored.
//
// NOTE (2026-06): the in-app format guide intentionally documents only chunkTime
// and practiceTime (labelled "roundTime") — most users keep default break/rest
// for everything, so microbreakTime/restTime just made the format look complex.
// They are STILL parsed (and round-tripped by _routineToText) for power users and
// any pre-existing routines that use them; they're just undocumented in the UI.

function parseTime(token) {
  token = token.trim();
  if (!token) return null;
  // M:SS or :SS
  const colonMatch = token.match(/^(\d*):(\d+)$/);
  if (colonMatch) {
    const m = colonMatch[1] === '' ? 0 : parseInt(colonMatch[1], 10);
    const s = parseInt(colonMatch[2], 10);
    return m * 60 + s;
  }
  // Integer or decimal = minutes (e.g. 4 = 240s, 1.5 = 90s)
  const numMatch = token.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]) * 60);
  }
  return null;
}

function parseRoutineText(text) {
  const errors = [];
  const routine = {
    id:                   null,
    name:                 '',
    order:                'sequential',
    overallGoal:          '',   // whole-routine goal, shown at the start (first chunk ready)
    overallRetrospective: '',   // whole-routine question, shown at the very end (final rest)
    // Routine-level time overrides (null = inherit the user's settings). They make
    // a routine self-contained: a chunk's own positional time still wins, then
    // these, then the user's global settings. See getDur() in routine-player.js.
    workDur:              null,  // "Practice Round:" — length of each practice round
    breakDur:             null,  // "Microbreak:"     — micro-break between rounds
    restDur:              null,  // "Rest:"           — rest after each chunk
    chunks:               [],
  };

  let hasName      = false;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw     = lines[i];
    const line    = raw.trim();

    if (!line || line.startsWith('#')) continue;

    // Name:
    if (/^Name:/i.test(line)) {
      const val = line.slice(5).trim();
      if (!val) {
        errors.push(`Line ${lineNum}: Name cannot be empty.`);
      } else {
        routine.name = val;
        hasName = true;
      }
      continue;
    }

    // Order:
    if (/^Order:/i.test(line)) {
      const val = line.slice(6).trim().toLowerCase();
      if (val === 'sequential') {
        routine.order = 'sequential';
      } else if (val === 'random') {
        routine.order = 'random';
      } else {
        errors.push(`Line ${lineNum}: Did not recognize Order value "${line.slice(6).trim()}". Use Sequential or Random.`);
      }
      continue;
    }

    // Overall Goal: — whole-routine goal, shown at the start (first chunk ready).
    {
      const m = line.match(/^Overall Goal:\s*(.*)$/i);
      if (m) { routine.overallGoal = m[1].trim(); continue; }
    }

    // Overall Retrospective: — whole-routine question, shown at the very end
    // (the final rest, after the last chunk).
    {
      const m = line.match(/^Overall Retrospective:\s*(.*)$/i);
      if (m) { routine.overallRetrospective = m[1].trim(); continue; }
    }

    // Routine-level time overrides. Same time format as chunk times (M:SS, :SS,
    // integer minutes, decimal). "Microbreak" also accepts "Micro-break".
    {
      const m = line.match(/^(Practice Round|Micro-?break|Rest)\s*:\s*(.*)$/i);
      if (m) {
        const key = m[1].toLowerCase().replace(/-/g, '');
        const field = key.startsWith('practice') ? 'workDur' : key === 'rest' ? 'restDur' : 'breakDur';
        const val = m[2].trim();
        if (val !== '') {           // empty value = leave null (inherit settings)
          const t = parseTime(val);
          // Must be a real, positive duration — a 0s round/break/rest is invalid
          // (it would produce zero-length phases).
          if (t === null || t <= 0) errors.push(`Line ${lineNum}: "${m[1]}" needs a time greater than zero (got "${val}").`);
          else                      routine[field] = t;
        }
        continue;
      }
    }

    // Unrecognized keyword (word followed by colon, no spaces before colon)
    if (/^\w[\w\s]*:/.test(line) && !/^\d/.test(line)) {
      const keyword = line.match(/^([^:]+):/)[1].trim();
      errors.push(`Line ${lineNum}: Did not recognize "${keyword}:".`);
      continue;
    }

    // Chunk line: {times} {subject}[; goal][; strategy][; retroQ]
    const parts   = line.split(';').map(p => p.trim());
    const timeSub = parts[0];
    const goal    = parts[1] || '';
    const strategy    = parts[2] || '';
    const retrospectiveQ = parts[3] || '';

    // Extract leading time tokens from timeSub
    // Time tokens: M:SS, :SS, integer, or decimal (e.g. 1.5 = 1:30)
    const timePattern = /^((?:\d*:\d+|\d+(?:\.\d+)?)(?:\s*,\s*(?:\d*:\d+|\d+(?:\.\d+)?))*)\s+(.+)$/;
    const match = timeSub.match(timePattern);

    if (!match) {
      // No leading time — could be a subject-only line (error: no chunkTime)
      // or a malformed line
      if (/^\d/.test(timeSub)) {
        errors.push(`Line ${lineNum}: Could not parse time(s) or subject from "${timeSub}".`);
      } else {
        errors.push(`Line ${lineNum}: Chunk line must start with a time (e.g. "4:00 G Major Scale").`);
      }
      continue;
    }

    const timeTokens = match[1].split(',').map(t => t.trim());
    const subject    = match[2].trim();

    if (!subject) {
      errors.push(`Line ${lineNum}: Chunk has no subject after the time.`);
      continue;
    }

    const errCountBefore = errors.length;
    const times = timeTokens.map(tok => {
      const t = parseTime(tok);
      if (t === null) {
        errors.push(`Line ${lineNum}: Invalid time "${tok}".`);
      }
      return t;
    });

    // Skip this chunk only if THIS line's time parse failed — compare against the
    // pre-line count, not errors.length (which would also skip every later valid
    // chunk once any earlier line had erred, then falsely report "no chunks").
    if (errors.length > errCountBefore) continue;

    const chunk = {
      subject,
      goal:            goal,
      strategy:        strategy,
      retrospectiveQ:  retrospectiveQ,
      chunkTime:       times[0] ?? null,
      practiceTime:    times[1] ?? null,
      microbreakTime:  times[2] ?? null,
      restTime:        times[3] ?? null,
    };
    routine.chunks.push(chunk);
  }

  if (!hasName) {
    errors.push('Missing "Name:" line.');
  }
  if (routine.chunks.length === 0 && errors.length === 0) {
    errors.push('Routine has no chunks. Add at least one practice line.');
  }

  return { routine, errors };
}
