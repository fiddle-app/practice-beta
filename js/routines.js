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
