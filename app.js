/* =====================================================
   NotaPareja — app.js
   Real-time notes with Firebase Realtime Database
   ===================================================== */

// ── State ──────────────────────────────────────────────
const STATE = {
  roomCode:    null,
  currentNote: null,
  notes:       {},       // { noteId: noteData }
  db:          null,     // Firebase DB reference
  roomRef:     null,     // DB ref for current room
  userName:    null,
  saveTimer:   null,
  isFirebaseReady: false,
};

// ── Persistence helpers ────────────────────────────────
function ls(key, val) {
  if (val === undefined) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  localStorage.setItem(key, JSON.stringify(val));
}

// ── Firebase ───────────────────────────────────────────
function initFirebase(config) {
  try {
    // Delete existing Firebase app if any
    if (firebase.apps.length) {
      firebase.app().delete().catch(() => {});
    }
    firebase.initializeApp(config);
    STATE.db = firebase.database();
    STATE.isFirebaseReady = true;
    ls('firebaseConfig', config);
    return true;
  } catch (e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

function tryLoadSavedFirebase() {
  const saved = ls('firebaseConfig');
  if (saved) return initFirebase(saved);
  return false;
}

// ── Room Management ────────────────────────────────────
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateUserName() {
  const emojis = ['🌙','⭐','🌸','🦋','🌺','🎵','✨','💫','🌿','🍀'];
  const names = ['Luna', 'Sol', 'Estrella', 'Flor', 'Brisa', 'Nube', 'Río', 'Monte', 'Mar', 'Cielo'];
  return emojis[Math.floor(Math.random() * emojis.length)] + ' ' + names[Math.floor(Math.random() * names.length)];
}

function createRoom() {
  if (!STATE.isFirebaseReady) {
    openFirebaseModal();
    return;
  }
  const code = generateRoomCode();
  enterRoom(code);
}

function joinRoom() {
  const input = document.getElementById('room-code-input');
  const code = input.value.trim().toUpperCase();
  if (!code) { showToast('Ingresa un código de sala', 'error'); return; }
  if (!STATE.isFirebaseReady) {
    ls('pendingRoom', code);
    openFirebaseModal();
    return;
  }
  enterRoom(code);
}

function enterRoom(code) {
  STATE.roomCode = code;
  STATE.userName = ls('userName') || generateUserName();
  ls('userName', STATE.userName);
  ls('lastRoom', code);

  // Firebase ref
  STATE.roomRef = STATE.db.ref(`rooms/${code}`);

  // Listen for notes changes
  STATE.roomRef.child('notes').on('value', (snap) => {
    const data = snap.val() || {};
    STATE.notes = data;
    renderNotesList();
    if (STATE.currentNote && data[STATE.currentNote]) {
      syncCurrentNote(data[STATE.currentNote]);
    }
  });

  // Mark self as online
  const presenceRef = STATE.roomRef.child(`presence/${STATE.userName.replace(/[^a-zA-Z0-9]/g,'_')}`);
  presenceRef.set({ name: STATE.userName, online: true, ts: Date.now() });
  presenceRef.onDisconnect().remove();

  // Show app
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Update room indicator
  const dot = document.getElementById('room-dot');
  const label = document.getElementById('room-label');
  dot.classList.add('online');
  label.textContent = `Sala: ${code}`;

  showToast(`✅ Sala ${code} activa`, 'success');
}

function syncCurrentNote(data) {
  // Avoid overwriting while user is typing
  if (STATE.saveTimer) return;

  const titleEl = document.getElementById('note-title');
  const contentEl = document.getElementById('note-content');

  if (document.activeElement !== titleEl) {
    titleEl.value = data.title || '';
  }
  if (document.activeElement !== contentEl) {
    contentEl.innerHTML = data.content || '';
  }
  document.getElementById('note-author').textContent =
    data.lastEditor ? `Editado por ${data.lastEditor}` : '';
}

// ── Notes CRUD ─────────────────────────────────────────
function createNote() {
  if (!STATE.roomRef) { showToast('Primero únete a una sala', 'error'); return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const note = {
    id,
    title: 'Nueva nota',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: STATE.userName,
    lastEditor: STATE.userName,
  };
  STATE.roomRef.child(`notes/${id}`).set(note);
  selectNote(id);
}

function selectNote(id) {
  STATE.currentNote = id;
  const note = STATE.notes[id];

  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('editor-container').classList.remove('hidden');

  document.getElementById('note-title').value = note ? (note.title || '') : '';
  document.getElementById('note-content').innerHTML = note ? (note.content || '') : '';
  document.getElementById('note-author').textContent =
    note && note.lastEditor ? `Editado por ${note.lastEditor}` : '';
  document.getElementById('save-status').textContent = 'Guardado ✓';
  document.getElementById('save-status').classList.remove('saving');

  // Update sidebar active state
  document.querySelectorAll('.note-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

function deleteCurrentNote() {
  if (!STATE.currentNote || !STATE.roomRef) return;
  if (!confirm('¿Eliminar esta nota?')) return;
  STATE.roomRef.child(`notes/${STATE.currentNote}`).remove();
  STATE.currentNote = null;
  document.getElementById('editor-container').classList.add('hidden');
  document.getElementById('empty-state').classList.remove('hidden');
  showToast('Nota eliminada', 'info');
}

// ── Auto-save ──────────────────────────────────────────
function saveCurrentNote() {
  if (!STATE.currentNote || !STATE.roomRef) return;
  const title   = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').innerHTML;

  STATE.roomRef.child(`notes/${STATE.currentNote}`).update({
    title,
    content,
    updatedAt: Date.now(),
    lastEditor: STATE.userName,
  });

  const status = document.getElementById('save-status');
  status.textContent = 'Guardado ✓';
  status.classList.remove('saving');
}

function scheduleSave() {
  const status = document.getElementById('save-status');
  status.textContent = 'Guardando…';
  status.classList.add('saving');
  clearTimeout(STATE.saveTimer);
  STATE.saveTimer = setTimeout(() => {
    STATE.saveTimer = null;
    saveCurrentNote();
  }, 800);
}

function updateNoteTitle(val) {
  scheduleSave();
}

function onContentChange() {
  scheduleSave();
}

// ── Render Sidebar ─────────────────────────────────────
function renderNotesList(filter = '') {
  const list = document.getElementById('notes-list');
  const notes = Object.values(STATE.notes)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const filtered = filter
    ? notes.filter(n =>
        (n.title || '').toLowerCase().includes(filter.toLowerCase()) ||
        (stripHtml(n.content || '')).toLowerCase().includes(filter.toLowerCase())
      )
    : notes;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:12px;">
      ${filter ? 'Sin resultados' : 'No hay notas aún.<br>Crea la primera ✨'}
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(note => `
    <div class="note-item ${note.id === STATE.currentNote ? 'active' : ''}"
         data-id="${note.id}"
         onclick="selectNote('${note.id}')">
      <div class="note-item-title">${escapeHtml(note.title || 'Sin título')}</div>
      <div class="note-item-preview">${escapeHtml(stripHtml(note.content || '').slice(0, 60)) || '...'}</div>
      <div class="note-item-footer">
        <span class="note-item-date">${formatRelativeDate(note.updatedAt)}</span>
        ${note.lastEditor ? `<span class="note-item-author">${note.lastEditor.slice(0,12)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function filterNotes(val) {
  renderNotesList(val);
}

// ── Rich Text Editor ───────────────────────────────────
function execCmd(cmd, val = null) {
  document.getElementById('note-content').focus();
  document.execCommand(cmd, false, val);
  onContentChange();
}

function formatBlock(tag) {
  document.getElementById('note-content').focus();
  document.execCommand('formatBlock', false, tag);
  onContentChange();
}

function handleEditorKeydown(e) {
  // Ctrl+B, Ctrl+I, Ctrl+U handled natively by browser
  // Tab key → insert spaces
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '    ');
  }
}

// ── Share Modal ────────────────────────────────────────
function openShareModal() {
  if (!STATE.roomCode) { showToast('Primero únete a una sala', 'error'); return; }
  document.getElementById('share-room-code').textContent = STATE.roomCode;
  const url = `${location.href.split('?')[0]}?room=${STATE.roomCode}`;
  document.getElementById('share-url').value = url;
  document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('share-modal').classList.add('hidden');
}

function copyRoomCode() {
  navigator.clipboard.writeText(STATE.roomCode).then(() => {
    showToast('¡Código copiado! 📋', 'success');
  });
}

function copyShareUrl() {
  const url = document.getElementById('share-url').value;
  navigator.clipboard.writeText(url).then(() => {
    showToast('¡Enlace copiado! 🔗', 'success');
  });
}

// ── Sidebar ────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── Firebase Modal ─────────────────────────────────────
function openFirebaseModal() {
  document.getElementById('firebase-modal').classList.remove('hidden');
}

function closeFirebaseModal() {
  document.getElementById('firebase-modal').classList.add('hidden');
}

function saveFirebaseConfig() {
  let raw = document.getElementById('firebase-config-input').value.trim();

  // Strip ES module import/export lines — they contain { } that confuse the regex
  // e.g. "import { initializeApp } from 'firebase/app';"
  raw = raw.replace(/^(import|export)\b.*?;?\s*$/gm, '');

  // Strip "const app = initializeApp(firebaseConfig);" lines
  raw = raw.replace(/const\s+\w+\s*=\s*initializeApp\s*\([^)]*\)\s*;?/g, '');

  let config;
  try {
    // Now the first { } block is guaranteed to be the firebaseConfig object
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('No object found');

    // Function() can evaluate JS object literals with unquoted keys
    // (JSON.parse fails because Firebase uses  apiKey: "..."  not  "apiKey": "...")
    config = Function('"use strict"; return (' + match[0] + ')')();

    if (typeof config !== 'object' || config === null) throw new Error('Not an object');
  } catch (e) {
    console.error('Config parse error:', e);
    showToast('⚠️ Configuración inválida — pega el bloque completo de Firebase', 'error');
    return;
  }

  if (!config.apiKey) {
    showToast('⚠️ No se encontró apiKey en la configuración', 'error');
    return;
  }
  if (!config.databaseURL) {
    showToast('⚠️ Falta databaseURL — asegúrate de haber creado la Realtime Database', 'error');
    return;
  }

  const ok = initFirebase(config);
  if (!ok) { showToast('❌ Error al inicializar Firebase — revisa la consola (F12)', 'error'); return; }

  closeFirebaseModal();
  showToast('✅ Firebase conectado', 'success');

  // If there was a pending room action
  const pending = ls('pendingRoom');
  if (pending) {
    ls('pendingRoom', null);
    enterRoom(pending);
  } else {
    document.getElementById('setup-screen').classList.remove('hidden');
  }
}

// ── Toast ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, 2800);
}

// ── Utility ────────────────────────────────────────────
function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatRelativeDate(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000)  return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
  return new Date(ts).toLocaleDateString('es', { day:'numeric', month:'short' });
}

// ── Init ───────────────────────────────────────────────
function init() {
  // Try loading firebase config from localStorage
  const firebaseReady = tryLoadSavedFirebase();

  // Check URL for room param
  const params = new URLSearchParams(location.search);
  const roomFromUrl = params.get('room');

  if (firebaseReady) {
    const lastRoom = roomFromUrl || ls('lastRoom');
    if (lastRoom) {
      enterRoom(lastRoom);
    } else {
      document.getElementById('setup-screen').classList.remove('hidden');
    }
  } else {
    document.getElementById('setup-screen').classList.remove('hidden');
    if (roomFromUrl) ls('pendingRoom', roomFromUrl);
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);
