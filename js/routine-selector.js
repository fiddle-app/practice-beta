'use strict';

// =================================================
// ROUTINE SELECTOR — "What do you want to practice?" modal
//                    + New/Edit Routine modal
// =================================================

const STARTER_ROUTINE_TEXT =
`Name: My Routine
Order: Sequential
5:00 First thing to practice`;

// ---- Selector modal ----

function openRoutineSelector() {
  _renderSelectorList();
  $('routine-selector-overlay').classList.add('open');
}

function _closeRoutineSelector() {
  $('routine-selector-overlay').classList.remove('open');
}

let _pressTimer   = null;
let _didLongPress = false;
let _pressOrigin  = null;

function _renderSelectorList() {
  const list      = getAllRoutines();
  const container = $('routine-selector-list');
  container.innerHTML = '';

  list.forEach(routine => {
    const row = document.createElement('div');
    row.className = 'rs-row';

    const nameBtn = document.createElement('button');
    nameBtn.className = 'rs-name-btn';
    nameBtn.textContent = routine.name;

    // Long-press (500 ms) opens the editor; short tap starts the routine
    nameBtn.addEventListener('pointerdown', (e) => {
      _didLongPress  = false;
      _pressOrigin   = { x: e.clientX, y: e.clientY };
      _pressTimer    = setTimeout(() => {
        _didLongPress = true;
        _pressTimer   = null;
        openRoutineEditor(routine);
      }, 500);
    });
    nameBtn.addEventListener('pointermove', (e) => {
      if (_pressTimer !== null && _pressOrigin) {
        const dx = e.clientX - _pressOrigin.x;
        const dy = e.clientY - _pressOrigin.y;
        if (dx * dx + dy * dy > 64) { // > 8 px movement cancels press
          clearTimeout(_pressTimer);
          _pressTimer = null;
        }
      }
    });
    ['pointerup', 'pointercancel'].forEach(ev => {
      nameBtn.addEventListener(ev, () => { clearTimeout(_pressTimer); _pressTimer = null; });
    });
    nameBtn.addEventListener('contextmenu', e => e.preventDefault());
    nameBtn.addEventListener('click', () => {
      if (_didLongPress) return;
      _closeRoutineSelector();
      startRoutine(routine);
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'rs-icon-btn';
    editBtn.setAttribute('aria-label', 'Edit ' + routine.name);
    editBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.addEventListener('click', () => openRoutineEditor(routine));

    const delBtn = document.createElement('button');
    delBtn.className = 'rs-icon-btn rs-delete-btn';
    delBtn.setAttribute('aria-label', 'Delete ' + routine.name);
    delBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener('click', () => _confirmDelete(routine, row));

    row.append(nameBtn, editBtn, delBtn);
    container.appendChild(row);
  });
}

function _confirmDelete(routine, row) {
  // Replace row content with inline confirm
  row.innerHTML = '';
  const msg = document.createElement('span');
  msg.className = 'rs-confirm-msg';
  msg.textContent = 'Delete "' + routine.name + '"?';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'rs-confirm-yes';
  yesBtn.textContent = 'Delete';
  yesBtn.addEventListener('click', () => {
    deleteRoutine(routine.id);
    _renderSelectorList();
  });

  const noBtn = document.createElement('button');
  noBtn.className = 'rs-confirm-no';
  noBtn.textContent = 'Cancel';
  noBtn.addEventListener('click', () => _renderSelectorList());

  row.append(msg, yesBtn, noBtn);
}

// ---- Editor modal ----

let _editingRoutineId = null;
let _validationTimer  = null;

function openRoutineEditor(routine) {
  _editingRoutineId = routine ? routine.id : null;

  const textarea = $('routine-editor-textarea');
  if (routine) {
    textarea.value = _routineToText(routine);
    $('routine-editor-title').textContent = 'Edit Routine';
  } else {
    textarea.value = STARTER_ROUTINE_TEXT;
    $('routine-editor-title').textContent = 'New Routine';
  }

  $('routine-editor-status').textContent = '';
  $('routine-editor-status').className   = 're-status';
  _validateEditor();

  const guidance = $('re-guidance-details');
  if (guidance) guidance.open = true;

  $('routine-editor-overlay').classList.add('open');
  textarea.focus();
  // Pre-select the name value so the user can type immediately to replace it
  if (!routine) {
    const prefix = 'Name: ';
    const start  = textarea.value.indexOf(prefix) + prefix.length;
    const end    = textarea.value.indexOf('\n', start);
    textarea.setSelectionRange(start, end >= 0 ? end : textarea.value.length);
  }
}

function _closeEditor() {
  $('routine-editor-overlay').classList.remove('open');
}

function _validateEditor() {
  const text   = $('routine-editor-textarea').value;
  const result = parseRoutineText(text);
  const status = $('routine-editor-status');
  const doneBtn = $('routine-editor-done');

  if (result.errors.length > 0) {
    status.textContent = result.errors[0];
    status.className   = 're-status re-error';
    doneBtn.disabled   = true;
  } else {
    status.textContent = 'Looks good';
    status.className   = 're-status re-ok';
    doneBtn.disabled   = false;
  }
}

function _scheduleValidation() {
  clearTimeout(_validationTimer);
  _validationTimer = setTimeout(_validateEditor, 300);
}

function _saveEditor() {
  const text   = $('routine-editor-textarea').value;
  const result = parseRoutineText(text);
  if (result.errors.length > 0) return;

  const routine = result.routine;
  routine.id    = _editingRoutineId || null;
  upsertRoutine(routine);

  _closeEditor();
  _renderSelectorList();
}

// Copy as PLAIN TEXT ONLY. Bug: on iOS, navigator.clipboard.writeText() lets
// Mail paste a URL representation of the text, so every space comes out as %20.
// Writing an explicit single text/plain flavor (ClipboardItem) gives iOS nothing
// but plain text to choose from. The hidden-textarea + execCommand path is the
// long-standing plain-text-only fallback for older iOS / non-secure contexts.
// Nothing here encodes or escapes — the routine text is copied verbatim.
async function copyPlainText(text) {
  // Preferred: one explicit text/plain flavor, no URL flavor for Mail to grab.
  try {
    if (navigator.clipboard && typeof navigator.clipboard.write === 'function' && window.ClipboardItem) {
      const item = new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (e) { /* fall through to execCommand */ }
  // Fallback: copy a hidden textarea's selection — plain text only, all iOS.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top      = '0';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch (e) { /* fall through to writeText */ }
  // Last resort: the original writeText (may %20 on iOS Mail, but better than nothing).
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* give up */ }
  return false;
}

function _copyEditorText() {
  const text = $('routine-editor-textarea').value;
  copyPlainText(text).then((ok) => {
    _flashBtn($('routine-editor-copy'), ok ? 'Copied!' : 'Failed');
  });
}

function _pasteEditorText() {
  navigator.clipboard.readText().then(text => {
    $('routine-editor-textarea').value = text;
    _validateEditor();
    _flashBtn($('routine-editor-paste'), 'Pasted!');
  }).catch(() => {
    _flashBtn($('routine-editor-paste'), 'Failed');
  });
}

function _flashBtn(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

// Convert a stored routine back to editable text
function _routineToText(routine) {
  const lines = [];
  lines.push('Name: ' + routine.name);

  const orderMap = { sequential: 'Sequential', random: 'Random' };
  if (routine.order && routine.order !== 'sequential') {
    lines.push('Order: ' + (orderMap[routine.order] || 'Sequential'));
  }

  routine.chunks.forEach(chunk => {
    // Build the positional time prefix: chunkTime, practiceTime, microbreakTime,
    // restTime. Emit a contiguous prefix up to the last specified value — a
    // positional list can't have holes, so an interior null below a specified
    // value is backfilled with the matching global default (its effective value).
    const raw     = [chunk.chunkTime, chunk.practiceTime, chunk.microbreakTime, chunk.restTime];
    const globals = [settings.chunkDur, settings.workDur, settings.breakDur, settings.restDur];
    let lastIdx = -1;
    for (let k = 0; k < 4; k++) if (raw[k] !== null && raw[k] !== undefined) lastIdx = k;
    const times = [];
    for (let k = 0; k <= lastIdx; k++) {
      const v = (raw[k] !== null && raw[k] !== undefined) ? raw[k] : globals[k];
      times.push(_fmtTime(v));
    }

    const timeStr = times.join(', ');
    const suffix  = [chunk.goal, chunk.strategy, chunk.retrospectiveQ]
      .map(s => s || '')
      .join('; ')
      .replace(/;\s*$/, '').replace(/(?:;\s*)+$/, '');

    const chunkLine = (timeStr ? timeStr + ' ' : '') + chunk.subject + (suffix ? '; ' + suffix : '');
    lines.push(chunkLine);
  });

  return lines.join('\n');
}

function _fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + s.toString().padStart(2, '0');
}

// ---- Wire up DOM events (called once after DOM ready) ----

function initRoutineSelector() {
  // Selector overlay events
  $('rs-free-practice-btn').addEventListener('click', () => {
    _closeRoutineSelector();
    // activeRoutine is already null — timer starts as free practice
  });

  $('rs-new-routine-btn').addEventListener('click', () => openRoutineEditor(null));

  // Back arrow on the start screen
  const planBack = $('plan-back-btn');
  if (planBack) planBack.addEventListener('click', () => openRoutineSelector());

  // Editor overlay events
  $('routine-editor-textarea').addEventListener('input', _scheduleValidation);
  $('routine-editor-done').addEventListener('click', _saveEditor);
  $('routine-editor-cancel').addEventListener('click', _closeEditor);
  $('routine-editor-copy').addEventListener('click', _copyEditorText);
  $('routine-editor-paste').addEventListener('click', _pasteEditorText);
}
