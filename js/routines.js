'use strict';

// =================================================
// ROUTINE STORAGE — CRUD + localStorage
// =================================================
const ROUTINES_KEY = 'mb-routines';

function loadRoutines() {
  try {
    return JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]');
  } catch(e) { return []; }
}

function saveRoutinesList(list) {
  try { localStorage.setItem(ROUTINES_KEY, JSON.stringify(list)); } catch(e) {}
}

function getAllRoutines() {
  return loadRoutines();
}

function getRoutineById(id) {
  return loadRoutines().find(r => r.id === id) || null;
}

function upsertRoutine(routine) {
  const list = loadRoutines();
  if (!routine.id) {
    routine.id = 'r-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
  }
  const idx = list.findIndex(r => r.id === routine.id);
  if (idx >= 0) {
    list[idx] = routine;
  } else {
    list.push(routine);
  }
  saveRoutinesList(list);
  return routine;
}

function deleteRoutine(id) {
  const list = loadRoutines().filter(r => r.id !== id);
  saveRoutinesList(list);
}

// Practice routines are SACRED: no reset path may ever delete them. The user has
// too much invested, and can remove them manually in the selector. Any settings
// or data reset must run inside this wrapper — it snapshots the routines key and
// restores it afterward, even if the wrapped work clears all of localStorage. Run
// in a finally so a throw inside the reset can't strand the routines either.
function withRoutinesPreserved(fn) {
  const snapshot = localStorage.getItem(ROUTINES_KEY);
  try {
    return fn();
  } finally {
    if (snapshot !== null && localStorage.getItem(ROUTINES_KEY) !== snapshot) {
      try { localStorage.setItem(ROUTINES_KEY, snapshot); } catch (e) {}
    }
  }
}

// =================================================
// DEFAULT (SEEDED) ROUTINES
// =================================================
// Two worked examples that ship with a fresh install AND re-appear after a Hard
// reset (the diagnostic full nuke clears localStorage, so the ROUTINES_KEY is
// absent on the next boot → seedDefaultRoutinesIfMissing re-installs them).
//
// The trigger is "key is null", NOT "list is empty". That distinction is the
// whole design: a user who manually deletes every routine leaves an EMPTY ARRAY
// under the key, which we respect (no nag re-seeding). Only the total absence of
// the key — a never-touched install, or a post-Hard-reset boot — re-seeds. The
// SOFT reset (doReset) preserves whatever routines exist via withRoutinesPreserved
// and never reaches this path, so seeded examples a user edited or deleted stay
// edited/deleted across a normal reset.
//
// Chunk shape mirrors what routine-parser.js produces so these round-trip through
// the editor (_routineToText → parseRoutineText) without loss. Only chunkTime is
// set per chunk; practiceTime/microbreakTime/restTime are null so each inherits
// the user's global defaults — matching the simplified documented format.
//
// Content (goals / strategies / retrospective questions) is grounded in violin
// pedagogy — Molly Gebrian's practice-science (interleaving, slow/mindful reps,
// reflective self-questioning between reps), plus Fischer/Galamian/Flesch on
// drones, ghost shifts, and note-by-note double-stop tuning. "Example Interleaving"
// references real repertoire passages (Bach Partita No. 2 / Chaconne, Tchaikovsky
// Violin Concerto) and runs in random order to model interleaved practice.
const _ck = (chunkTime, subject, goal, strategy, retrospectiveQ) => ({
  subject, goal, strategy, retrospectiveQ,
  chunkTime, practiceTime: null, microbreakTime: null, restTime: null,
});

// The ids are intentionally stable so an edited example round-trips in place via
// upsertRoutine. They must NEVER be re-seeded over an existing key — the only
// seed path (seedDefaultRoutinesIfMissing) is gated on the key being absent, so a
// user's edits to an example can't be clobbered by a later app boot.
const DEFAULT_ROUTINES = [
  {
    id: 'r-example-daily',
    name: 'Example Daily',
    order: 'sequential',
    chunks: [
      _ck(300, 'Major scale',
        'Even intonation against tonic drone',
        'Play slowly, tune each note to the drone',
        'Which scale degrees pulled sharp or flat against the drone?'),
      _ck(300, 'Arpeggios',
        'Secure chord shapes with beautiful tone',
        'Slow, strong bow, name each chord tone aloud',
        'Could you hear the chord, or just play the notes?'),
      _ck(180, 'Shifting',
        'Accurate arrivals with relaxed hand',
        'Ghost the intermediate note softly, release thumb weight',
        'Did your hand stay loose, or grip before each shift?'),
      _ck(180, 'Major scale',
        'Clean shifts and steady tone at tempo',
        'Vary rhythms, dotted then even, before full speed',
        'Did any rhythm pattern expose a weak shift or finger?'),
      _ck(300, 'Double stops',
        'In-tune intervals built note by note',
        'Tune lower note, add upper, bow one string each',
        'Which interval rang clean and which sounded beaty?'),
      _ck(180, 'Arpeggios',
        'Smooth string crossings across octaves',
        'Isolate the crossings, ghost the shifts, then connect',
        'Where did string crossings or shifts break the line?'),
      _ck(180, 'Shifting',
        'Confident shifts without visual checking',
        'Shift eyes-closed, hear the target pitch first',
        'How often did you land the target by ear alone?'),
      _ck(180, 'Double stops',
        'Balanced tone on both strings',
        'Equal bow weight, light fingers, hold the shape',
        'Did the bow favor one string over the other?'),
    ],
  },
  {
    id: 'r-example-interleaving',
    name: 'Example Interleaving',
    order: 'random',
    chunks: [
      _ck(300, 'Bach Partita No. 2 — Sarabanda, opening eight bars',
        'Shape the slow chordal melody line',
        'Roll each chord top-down keeping melody on top',
        'Did the top voice sing through every chord cleanly?'),
      _ck(300, 'Bach Partita No. 2 — Giga, first half to repeat',
        'Even 12/8 lilt at a steady tempo',
        'Subdivide in 4 with metronome then drop it',
        'Where did the pulse rush or drag on the string crossings?'),
      _ck(300, 'Bach Chaconne — arpeggio section, mm. 89-92',
        'Smooth bariolage with relaxed bow arm',
        'Block chords first then unfold the arpeggios',
        'Was the bow arm tense or loose across the strings?'),
      _ck(300, 'Tchaikovsky Concerto — 1st mvt cadenza, opening run',
        'Clean intonation up to the high register',
        'Practice slow in rhythm groups checking each shift',
        'Which high-position shifts still land out of tune?'),
      _ck(300, 'Tchaikovsky Concerto — Finale, trepak refrain theme',
        'Crisp spiccato at the fast folk tempo',
        'Build speed from half tempo five bpm at a time',
        'Did the spiccato stay even as the tempo climbed?'),
    ],
  },
];

// Install the default routines on a fresh install or post-Hard-reset boot. No-op
// once the key exists (including an empty list — a user who deleted everything is
// left alone). Returns true if it actually seeded. Deep-clones DEFAULT_ROUTINES so
// later edits to a saved routine can't mutate the in-memory template.
function seedDefaultRoutinesIfMissing() {
  if (localStorage.getItem(ROUTINES_KEY) !== null) return false;
  const seeded = DEFAULT_ROUTINES.map(r => ({
    ...r,
    chunks: r.chunks.map(c => ({ ...c })),
  }));
  saveRoutinesList(seeded);
  return true;
}
