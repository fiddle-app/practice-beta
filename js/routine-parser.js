'use strict';

// =================================================
// ROUTINE TEXT FORMAT PARSER
// =================================================
// Parses the user-facing text format into a routine object.
// Returns { routine, errors } where errors is an array of strings.
//
// Format:
//   Name: {name}
//   [Order: {Sequential | Random | Random with no repeats}]
//   {chunkTime}[, {practiceTime}[, {microbreakTime}]] {subject}[; {goal}][; {strategy}][; {retrospectiveQ}]
//   [{restTime} Rest]
//
// Times: M:SS  or  :SS  or  M  (plain integer = minutes)
// "Rest" is a reserved subject word that sets the rest duration for subsequent chunks.
// Blank lines and lines starting with # are ignored.

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
  // Plain integer = minutes
  const intMatch = token.match(/^(\d+)$/);
  if (intMatch) {
    return parseInt(intMatch[1], 10) * 60;
  }
  return null;
}

function parseRoutineText(text) {
  const errors = [];
  const routine = {
    id:        null,
    name:      '',
    order:     'sequential',
    chunks:    [],
  };

  let hasName      = false;
  let currentRestTime = null; // null = use global setting

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
    // Time tokens: M:SS, :SS, or standalone integer not part of subject text
    const timePattern = /^((?:\d*:\d+|\d+)(?:\s*,\s*(?:\d*:\d+|\d+))*)\s+(.+)$/;
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

    // "Rest" is a reserved word — sets the rest duration, not a chunk
    if (subject.toLowerCase() === 'rest') {
      const t = parseTime(timeTokens[0]);
      if (t === null) {
        errors.push(`Line ${lineNum}: Invalid time "${timeTokens[0]}" for Rest.`);
      } else {
        currentRestTime = t;
      }
      continue;
    }

    const times = timeTokens.map(tok => {
      const t = parseTime(tok);
      if (t === null) {
        errors.push(`Line ${lineNum}: Invalid time "${tok}".`);
      }
      return t;
    });

    if (errors.length) continue; // skip if time parse failed on this line

    const chunk = {
      subject,
      goal:            goal,
      strategy:        strategy,
      retrospectiveQ:  retrospectiveQ,
      chunkTime:       times[0] ?? null,
      practiceTime:    times[1] ?? null,
      microbreakTime:  times[2] ?? null,
      restTime:        currentRestTime,
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
