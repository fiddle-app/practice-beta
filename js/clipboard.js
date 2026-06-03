'use strict';
// =================================================
// SHARED CLIPBOARD HELPER
// Used by: microbreaker
// =================================================
// copyPlainText(text) copies a string to the clipboard as PLAIN TEXT ONLY,
// encoding/escaping nothing — the bytes are copied verbatim.
//
// Why this exists: on iOS, the navigator.clipboard API (writeText AND a
// text/plain ClipboardItem) leaves the receiving app (Mail / Gmail) free to
// paste a URL representation of the text, turning every space into %20. The
// legacy hidden-textarea + execCommand('copy') path writes ONLY a plain-text
// flavor and pastes verbatim — this app's "Copy log" button already uses it and
// is clean. So we make that the PRIMARY path and keep navigator.clipboard only
// as a fallback (desktop / contexts where execCommand is unavailable).
//
// Returns a Promise<boolean> — true if some path succeeded.
//
// Attribution: Fiddle App family (Casey Mullen).

function _execCommandCopy(text) {
  // Copy a hidden textarea's selection — plain text only, works across all iOS.
  // Must run inside a user-gesture stack (a click handler) to be allowed.
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
    return ok;
  } catch (e) {
    return false;
  }
}

async function copyPlainText(text) {
  // Preferred: legacy execCommand textarea copy — plain-text-only, no %20 on iOS.
  if (_execCommandCopy(text)) return true;

  // Fallback: explicit single text/plain flavor (no URL flavor for Mail to grab).
  try {
    if (navigator.clipboard && typeof navigator.clipboard.write === 'function' && window.ClipboardItem) {
      const item = new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (e) { /* fall through to writeText */ }

  // Last resort: writeText (may %20 on iOS Mail, but better than copying nothing).
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* give up */ }

  return false;
}
