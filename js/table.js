/**
 * ATRP — index.js
 * BCM (Continuous Measurement) logic + Client management.
 * BDM functions live in table.js but read window.ATRP_CLIENT_ID set here.
 *
 * Key design:
 *  • Data is ALWAYS stored against the client whose name is currently in #clientName.
 *  • On Save: if no client ID is known yet, we POST to api_clients.php which either
 *    creates a new client OR returns the existing one (duplicate guard lives in PHP).
 *  • On name selection from dropdown: load that client's full info + BCM + BDM data.
 *  • Nickname is a first-class field saved with the client record.
 */

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────
  const FUNCTIONS = ['Sensory', 'Escape', 'Attention', 'Tangible'];
  let SESSIONS = 3;

  // ── State ────────────────────────────────────────────────────
  let currentClientId  = null;
  let isLoadingData    = false;
  let sessionCountEl   = null;
  let rows             = 0;

  // ── Share client ID with BDM (table.js) via window property ──
  Object.defineProperty(window, 'ATRP_CLIENT_ID', {
    get: ()  => currentClientId,
    set: (v) => { currentClientId = v; },
    configurable: true
  });

  // ─────────────────────────────────────────────────────────────
  // CLIENT NAME INDICATOR  (updates badges in BCM + BDM panels)
  // ─────────────────────────────────────────────────────────────
  function updateClientIndicators(name, nickname) {
    const display = name
      ? (nickname ? `${name} (${nickname})` : name)
      : null;

    // Info-container badge
    const badge = document.getElementById('infoClientBadge');
    if (badge) {
      if (display) { badge.textContent = display; badge.style.display = 'inline-flex'; }
      else          { badge.style.display = 'none'; }
    }

    // BCM panel indicator
    const bcmInd  = document.getElementById('bcmClientIndicator');
    const bcmName = document.getElementById('bcmClientName');
    if (bcmInd && bcmName) {
      if (display) { bcmName.textContent = display; bcmInd.style.display = 'flex'; }
      else          { bcmInd.style.display = 'none'; }
    }

    // BDM panel indicator
    const bdmInd  = document.getElementById('bdmClientIndicator');
    const bdmName = document.getElementById('bdmClientName');
    if (bdmInd && bdmName) {
      if (display) { bdmName.textContent = display; bdmInd.style.display = 'flex'; }
      else          { bdmInd.style.display = 'none'; }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLIENT MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  async function loadClients() {
    try {
      const res    = await fetch('../php/api_clients.php');
      const result = await res.json();
      return (result.success && result.clients) ? result.clients : [];
    } catch (e) {
      console.error('loadClients:', e);
      return [];
    }
  }

  /**
   * POST to create a client (PHP returns existing record if name already exists).
   */
  async function saveClient(clientData) {
    try {
      const res = await fetch('../php/api_clients.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(clientData)
      });
      return await res.json();
    } catch (e) {
      console.error('saveClient:', e);
      return { success: false, error: e.message };
    }
  }

  // ── Dropdown ──────────────────────────────────────────────────
  function populateClientDropdown(clients) {
    const nameInput = document.getElementById('clientName');
    if (!nameInput) return;

    let dropdown = document.getElementById('clientDropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id        = 'clientDropdown';
      dropdown.className = 'client-dropdown';
      dropdown.style.cssText = `
        position:absolute; z-index:1000; background:#fff;
        border:1px solid #ddd; border-radius:6px;
        max-height:200px; overflow-y:auto; display:none;
        width:100%; left:0; top:100%;
        box-shadow:0 4px 12px rgba(0,0,0,.12);
      `;

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      nameInput.parentNode.insertBefore(wrapper, nameInput);
      wrapper.appendChild(nameInput);
      wrapper.appendChild(dropdown);

      // Only show dropdown while user is actively typing — never on focus/click
      nameInput.addEventListener('input', () => {
        if (nameInput.value.trim().length > 0) {
          filterClients(clients, nameInput.value);
        } else {
          dropdown.style.display = 'none';
        }
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
      });
    }

    // Refresh internal data reference only — do NOT auto-show dropdown on load
    dropdown._clients = clients;
  }

  function filterClients(clients, term) {
    const dropdown = document.getElementById('clientDropdown');
    if (!dropdown) return;

    const filtered = clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(term.toLowerCase())
    );

    if (filtered.length === 0) { dropdown.style.display = 'none'; return; }

    dropdown.innerHTML = filtered.map(c => `
      <div class="client-option"
           data-id="${c.id}"
           data-name="${c.full_name}"
           data-nickname="${c.nickname || ''}"
           style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #f0f0f0; font-size:13px;">
        <span style="font-weight:600;">${c.full_name}</span>
        ${c.nickname ? `<span style="color:#888; margin-left:6px;">(${c.nickname})</span>` : ''}
      </div>
    `).join('');

    dropdown.querySelectorAll('.client-option').forEach(opt => {
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent blur before click fires
        selectClient(parseInt(opt.dataset.id), opt.dataset.name);
      });
    });

    dropdown.style.display = 'block';
  }

  /**
   * Called when user clicks a name from the dropdown.
   * Loads all data for that client.
   */
  function selectClient(id, fullName) {
    currentClientId        = id;
    window.ATRP_CLIENT_ID  = id;

    const nameInput = document.getElementById('clientName');
    if (nameInput) nameInput.value = fullName || '';

    const dropdown = document.getElementById('clientDropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Load full client info (fills nickname, age, diagnosis, etc.)
    loadClientInfo(id).then(() => {
      // After info is loaded, update the indicator with nickname
      const nickname = document.getElementById('clientNickname')?.value || '';
      updateClientIndicators(fullName, nickname);
    });

    // Load BCM table data
    loadFromDatabase();

    // Load BDM table data (table.js)
    if (typeof loadBdmFromDatabase === 'function') loadBdmFromDatabase();
  }

  // ─────────────────────────────────────────────────────────────
  // CLIENT INFO  LOAD / SAVE
  // ─────────────────────────────────────────────────────────────
  async function loadClientInfo(clientId) {
    try {
      const res    = await fetch('../php/api_clients.php?client_id=' + clientId);
      const result = await res.json();

      if (result.success && result.client) {
        const c   = result.client;
        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.value = val || '';
        };
        set('clientNickname',  c.nickname);
        set('clientAge',       c.age);
        set('clientDiagnosis', c.diagnosis);
        set('clientRecorder',  c.recorder);
        set('reportStartDate', c.report_start_date);
        set('reportEndDate',   c.report_end_date);
      }
    } catch (e) {
      console.error('loadClientInfo:', e);
    }
  }

  async function saveClientInfo(clientId) {
    const get = (id) => document.getElementById(id)?.value || null;
    try {
      const res = await fetch('../php/api_clients.php', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:         clientId,
          full_name:         document.getElementById('clientName')?.value?.trim() || null,
          nickname:          get('clientNickname'),
          age:               get('clientAge'),
          diagnosis:         get('clientDiagnosis'),
          recorder:          get('clientRecorder'),
          report_start_date: get('reportStartDate'),
          report_end_date:   get('reportEndDate')
        })
      });
      return await res.json();
    } catch (e) {
      console.error('saveClientInfo:', e);
      return { success: false, error: e.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RESOLVE CLIENT
  // Returns a valid client ID — either the known one, or a newly
  // created / matched one based on the current name field.
  // ─────────────────────────────────────────────────────────────
  async function resolveClientId() {
    const nameValue = document.getElementById('clientName')?.value?.trim() || '';
    if (!nameValue) return null;

    // Already have an ID from a dropdown selection
    if (currentClientId) return currentClientId;

    // No ID yet — POST to PHP (which returns existing or creates new)
    const get = (id) => document.getElementById(id)?.value || null;
    const result = await saveClient({
      full_name:         nameValue,
      nickname:          get('clientNickname'),
      age:               get('clientAge'),
      diagnosis:         get('clientDiagnosis'),
      recorder:          get('clientRecorder'),
      report_start_date: get('reportStartDate'),
      report_end_date:   get('reportEndDate')
    });

    if (result.success && result.id) {
      currentClientId       = result.id;
      window.ATRP_CLIENT_ID = result.id;

      if (result.duplicate) {
        showNotification(`Linked to existing client "${nameValue}"`, 'success');
        // Reload their stored info so fields are populated
        await loadClientInfo(result.id);
      }
      return result.id;
    }

    showNotification(result.error || 'Could not resolve client', 'error');
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // BCM  SAVE
  // ─────────────────────────────────────────────────────────────
  async function saveToDatabase() {
    const nameValue = document.getElementById('clientName')?.value?.trim() || '';
    if (!nameValue) {
      showNotification('Please enter a client name before saving', 'error');
      return;
    }

    const saveBtn = document.getElementById('bcmSave');
    if (saveBtn) {
      saveBtn.classList.add('saving');
      saveBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none"
            stroke-dasharray="20" stroke-dashoffset="0">
            <animateTransform attributeName="transform" type="rotate"
              from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg> Saving...`;
    }

    try {
      const clientId = await resolveClientId();
      if (!clientId) return;

      // Always push the latest info-container values (including nickname)
      await saveClientInfo(clientId);

      // Update the live name indicators
      const nickname = document.getElementById('clientNickname')?.value || '';
      updateClientIndicators(nameValue, nickname);

      // ── Collect BCM rows ──────────────────────────────────────
      const behaviors = [];
      document.querySelectorAll('#bcmTableBody tr').forEach(row => {
        const cells    = row.querySelectorAll('td');
        const behavior = {
          antecedent: cells[0]?.querySelector('.cell-input')?.value || '',
          behavior:   cells[1]?.querySelector('.cell-input')?.value || '',
          sessions:   {},
          functions:  {}
        };
        row.querySelectorAll('.freq-display').forEach((display, i) => {
          behavior.sessions[i + 1] = parseInt(display.value) || 0;
        });
        const checkboxes = row.querySelectorAll('.fn-check input[type="checkbox"]');
        const fnLabels   = row.querySelectorAll('.fn-label');
        checkboxes.forEach((cb, i) => {
          if (fnLabels[i]) behavior.functions[fnLabels[i].textContent] = cb.checked;
        });
        behaviors.push(behavior);
      });

      const notes          = document.getElementById('notesInput')?.value || '';
      const sessionNumbers = [];
      document.querySelectorAll('.bcm-table thead .session-num').forEach(input => {
        sessionNumbers.push(parseInt(input.value) || 0);
      });

      const res    = await fetch('../php/api_bcm.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id: clientId, behaviors, sessions: sessionNumbers, notes })
      });
      const result = await res.json();

      if (result.success) {
        showNotification(`Saved BCM data for "${nameValue}"`, 'success');

        // Refresh dropdown in background so new client appears
        loadClients().then(clients => populateClientDropdown(clients));
      } else {
        showNotification('Error saving BCM: ' + result.error, 'error');
      }

    } catch (e) {
      console.error('BCM save error:', e);
      showNotification('Failed to connect to database', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.classList.remove('saving');
        saveBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 7.5l-4 4-3-3" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg> Save`;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BCM  LOAD
  // ─────────────────────────────────────────────────────────────
  async function loadFromDatabase() {
    if (isLoadingData) return;
    isLoadingData = true;

    try {
      if (!currentClientId) return; // nothing to load without a client

      const res    = await fetch('../php/api_bcm.php?client_id=' + currentClientId);
      const result = await res.json();

      if (result.success && result.behaviors && result.behaviors.length > 0) {
        const tbody = document.getElementById('bcmTableBody');
        tbody.innerHTML = '';
        rows = 0;

        // Ensure we have enough session columns
        let maxSessions = 0;
        result.behaviors.forEach(b => {
          if (b.sessions) {
            const keys = Object.keys(b.sessions).map(k => parseInt(k));
            if (keys.length) maxSessions = Math.max(maxSessions, ...keys);
          }
        });

        // Reset to base columns, then add as needed
        while (SESSIONS > 3)  { deleteSessionColumn(true); }
        while (SESSIONS < 3)  { addSessionColumn(true); }
        while (SESSIONS < maxSessions) { addSessionColumn(true); }

        result.behaviors.forEach(behavior => {
          const row   = createRow();
          const cells = row.querySelectorAll('td');

          const antInput = cells[0]?.querySelector('.cell-input');
          const behInput = cells[1]?.querySelector('.cell-input');
          if (antInput) antInput.value = behavior.antecedent || '';
          if (behInput) behInput.value = behavior.behavior   || '';

          row.querySelectorAll('.freq-display').forEach((display, i) => {
            if (behavior.sessions?.[i + 1] !== undefined) {
              display.value = behavior.sessions[i + 1];
            }
          });

          const checkboxes = row.querySelectorAll('.fn-check input[type="checkbox"]');
          const fnLabels   = row.querySelectorAll('.fn-label');
          checkboxes.forEach((cb, i) => {
            if (fnLabels[i] && behavior.functions) {
              cb.checked = behavior.functions[fnLabels[i].textContent] || false;
            }
          });

          tbody.appendChild(row);
          rows++;
        });

        const rowCountEl = document.getElementById('rowCount');
        if (rowCountEl) rowCountEl.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';

        const notesInput = document.getElementById('notesInput');
        if (notesInput && result.notes) notesInput.value = result.notes;

        showNotification('BCM data loaded', 'success');

      } else {
        // Client has no BCM data yet — show a blank row
        const tbody = document.getElementById('bcmTableBody');
        if (tbody) {
          tbody.innerHTML = '';
          tbody.appendChild(createRow());
          rows = 1;
          const rowCountEl = document.getElementById('rowCount');
          if (rowCountEl) rowCountEl.textContent = '1 behavior tracked';
        }
      }

    } catch (e) {
      console.error('BCM load error:', e);
    } finally {
      isLoadingData = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATION TOAST
  // ─────────────────────────────────────────────────────────────
  function showNotification(message, type) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
      position:fixed; top:80px; right:20px;
      padding:12px 20px; border-radius:8px;
      font-family:var(--ff-body); font-size:13px; font-weight:500;
      z-index:9999; animation:slideIn .3s ease;
      background:${type === 'success' ? '#10b981' : '#ef4444'};
      color:#fff; box-shadow:0 4px 12px rgba(0,0,0,.15);
      max-width:320px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Inject keyframe styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn  { from { transform:translateX(110%); opacity:0; } to { transform:translateX(0); opacity:1; } }
    @keyframes slideOut { from { transform:translateX(0);    opacity:1; } to { transform:translateX(110%); opacity:0; } }

    /* Nickname label hint */
    .label-hint { font-size:11px; color:#aaa; font-weight:400; margin-left:4px; }

    /* Client badge in info-header */
    .info-client-badge {
      display:inline-flex; align-items:center;
      background:var(--accent, #6366f1); color:#fff;
      font-size:11px; font-weight:600; padding:3px 10px;
      border-radius:20px; letter-spacing:.02em;
      margin-left:12px;
    }

    /* Panel indicators */
    .bcm-client-indicator,
    .bdm-client-indicator {
      display:flex; align-items:center; gap:6px;
      font-size:12px; color:#888;
    }
    .bcm-client-label,
    .bdm-client-label { font-weight:500; }
    .bcm-client-name,
    .bdm-client-name  { font-weight:700; color:var(--accent, #6366f1); }
  `;
  document.head.appendChild(style);

  // ─────────────────────────────────────────────────────────────
  // BCM TABLE HELPERS
  // ─────────────────────────────────────────────────────────────
  function createSessionHeader() {
    const thead      = document.querySelector('.bcm-table thead tr');
    const functionTh = thead.querySelector('.col-function');
    const th = document.createElement('th');
    th.className = 'col-session';
    th.innerHTML = `
      <span class="session-label">Session</span>
      <input class="session-num" type="text" placeholder="__" maxlength="3" />
      <span class="session-sub">Freq.</span>
    `;
    thead.insertBefore(th, functionTh);
  }

  function createFreqCell() {
    const tdS     = document.createElement('td');
    const div     = document.createElement('div');
    div.className = 'freq-cell';

    const display   = document.createElement('input');
    display.className = 'freq-display';
    display.type    = 'number';
    display.value   = '0';
    display.min     = '0';

    let count = 0;

    const minus = document.createElement('button');
    minus.className = 'freq-btn minus';
    minus.textContent = '−';
    minus.addEventListener('click', () => { if (count > 0) { count--; display.value = count; } });

    const plus = document.createElement('button');
    plus.className = 'freq-btn';
    plus.textContent = '+';
    plus.addEventListener('click', () => { count++; display.value = count; });

    display.addEventListener('change', () => {
      count = Math.max(0, parseInt(display.value) || 0);
      display.value = count;
    });

    div.appendChild(minus);
    div.appendChild(display);
    div.appendChild(plus);
    tdS.appendChild(div);
    return tdS;
  }

  /**
   * @param {boolean} silent — if true, suppresses session-count update
   *   (used during bulk restore to avoid flicker)
   */
  function addSessionColumn(silent = false) {
    SESSIONS++;
    createSessionHeader();
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
      tr.insertBefore(createFreqCell(), tr.querySelector('td:last-child'));
    });
    if (!silent) updateSessionCount();
  }

  function deleteSessionColumn(silent = false) {
    if (SESSIONS <= 1) return;
    SESSIONS--;
    const headerCells = document.querySelectorAll('.bcm-table thead tr .col-session');
    if (headerCells.length > 1) headerCells[headerCells.length - 1].remove();
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
      const freqCells = tr.querySelectorAll('.freq-cell');
      if (freqCells.length > 1) freqCells[freqCells.length - 1].parentElement.remove();
    });
    if (!silent) updateSessionCount();
  }

  function updateSessionCount() {
    if (sessionCountEl) {
      sessionCountEl.textContent = ' | ' + SESSIONS + ' session' + (SESSIONS !== 1 ? 's' : '');
    }
  }

  function createRow() {
    const tr = document.createElement('tr');

    // Antecedent
    const tdA = document.createElement('td');
    const taA = document.createElement('textarea');
    taA.className   = 'cell-input';
    taA.placeholder = 'Describe antecedent…';
    tdA.appendChild(taA);
    tr.appendChild(tdA);

    // Behavior
    const tdB = document.createElement('td');
    const taB = document.createElement('textarea');
    taB.className   = 'cell-input';
    taB.placeholder = 'Describe behavior…';
    tdB.appendChild(taB);
    tr.appendChild(tdB);

    // Session frequency cells
    for (let s = 0; s < SESSIONS; s++) tr.appendChild(createFreqCell());

    // Function checkboxes
    const tdF = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'function-cell';
    FUNCTIONS.forEach(fn => {
      const label = document.createElement('label');
      label.className = 'fn-check';
      const cb     = document.createElement('input');
      cb.type      = 'checkbox';
      const box    = document.createElement('span');
      box.className = 'fn-box';
      const text   = document.createElement('span');
      text.className = 'fn-label';
      text.textContent = fn;
      label.appendChild(cb);
      label.appendChild(box);
      label.appendChild(text);
      div.appendChild(label);
    });
    tdF.appendChild(div);
    tr.appendChild(tdF);

    return tr;
  }

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────
  const tbody      = document.getElementById('bcmTableBody');
  const rowCountEl = document.getElementById('rowCount');
  sessionCountEl   = document.getElementById('sessionCount');

  // Start with one blank row
  tbody.appendChild(createRow());
  rows = 1;
  updateSessionCount();

  // ── Button wiring ────────────────────────────────────────────
  document.getElementById('bcmSave')
    ?.addEventListener('click', saveToDatabase);

  document.getElementById('bcmAddSession')
    ?.addEventListener('click', () => addSessionColumn());

  document.getElementById('bcmDeleteSession')
    ?.addEventListener('click', () => deleteSessionColumn());

  document.getElementById('bcmAddRow')
    ?.addEventListener('click', () => {
      tbody.appendChild(createRow());
      rows++;
      rowCountEl.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';
    });

  document.getElementById('bcmDeleteRow')
    ?.addEventListener('click', () => {
      if (rows > 1) {
        tbody.removeChild(tbody.lastChild);
        rows--;
        rowCountEl.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';
      }
    });

  // ── Boot ─────────────────────────────────────────────────────
  async function initApp() {
    const clients = await loadClients();
    populateClientDropdown(clients);
    // Do NOT auto-load data — wait until a specific client is chosen/typed
  }

  initApp();

  // ── Expose helpers for table.js ──────────────────────────────
  window._atrp = {
    showNotification,
    resolveClientId,
    saveClientInfo,
    updateClientIndicators
  };

})();


// =============================================================
// BDM FUNCTIONS  (outside IIFE — read window.ATRP_CLIENT_ID)
// =============================================================

function getClientId() {
  return window.ATRP_CLIENT_ID || null;
}

async function saveBdmToDatabase() {
  const client_id = getClientId();
  if (!client_id) {
    // Try to resolve from the name field using the same helper
    if (window._atrp && typeof window._atrp.resolveClientId === 'function') {
      const resolved = await window._atrp.resolveClientId();
      if (!resolved) {
        showBdmNotification('Please select or enter a client name before saving.', 'error');
        return;
      }
    } else {
      showBdmNotification('Please select a client before saving.', 'error');
      return;
    }
  }

  const saveBtn = document.getElementById('bdmSave');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    const resolvedId   = getClientId();
    const NUM_INTERVALS = 10;
    const sessions     = [];

    document.querySelectorAll('.bdm-session-block').forEach((block, blockIndex) => {
      const dateInput       = block.querySelector('.date-input');
      const sessionNumInput = block.querySelector('.bdm-session-num-input');

      const session = {
        session_number: parseInt(sessionNumInput?.value) || (blockIndex + 1),
        session_date:   dateInput?.value || '',
        interval_count: NUM_INTERVALS,
        intervals:      {}
      };

      block.querySelectorAll('.interval-cell').forEach(cell => {
        const intervalNum = parseInt(cell.dataset.interval) + 1;
        const toggle      = cell.querySelector('.interval-toggle');
        if (toggle) {
          if      (toggle.classList.contains('positive')) session.intervals[intervalNum] = '+';
          else if (toggle.classList.contains('negative')) session.intervals[intervalNum] = '-';
          else                                            session.intervals[intervalNum] = '';
        }
      });

      sessions.push(session);
    });

    const notes = document.getElementById('bdmNotesInput')?.value || '';

    // Also push updated client info (including nickname) on BDM save
    if (window._atrp) await window._atrp.saveClientInfo(resolvedId);

    const response = await fetch('../php/api_bdm.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ client_id: resolvedId, sessions, notes })
    });

    const result = await response.json();
    if (result.success) {
      const clientName = document.getElementById('clientName')?.value || 'client';
      showBdmNotification(`Saved ${result.sessions_saved} session(s) for "${clientName}"`, 'success');

      // Update name indicators
      if (window._atrp) {
        const nickname = document.getElementById('clientNickname')?.value || '';
        window._atrp.updateClientIndicators(clientName, nickname);
      }
    } else {
      showBdmNotification('Error: ' + result.error, 'error');
    }

  } catch (err) {
    console.error('BDM Save error:', err);
    showBdmNotification('Failed to connect to database', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M11.5 7.5l-4 4-3-3" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg> Save`;
    }
  }
}

async function loadBdmFromDatabase() {
  const client_id = getClientId();
  if (!client_id) return;

  try {
    const response = await fetch(`../php/api_bdm.php?client_id=${client_id}`);
    const result   = await response.json();

    const grid = document.getElementById('bdmSessionsGrid');
    if (!grid) return;

    if (result.success && result.sessions?.length > 0) {
      grid.innerHTML = '';

      result.sessions.forEach((session, idx) => {
        const block = createSessionBlock(idx);

        const sessionNumInput = block.querySelector('.bdm-session-num-input');
        if (sessionNumInput) sessionNumInput.value = session.session_number || '';

        const dateInput = block.querySelector('.date-input');
        if (dateInput) dateInput.value = session.session_date || '';

        if (session.intervals) {
          Object.entries(session.intervals).forEach(([num, value]) => {
            const intervalIdx = parseInt(num) - 1;
            const cell = block.querySelector(
              `[data-session="${idx}"][data-interval="${intervalIdx}"]`
            );
            if (cell) {
              sessionData[idx][intervalIdx] = value;
              updateToggleCell(cell.querySelector('.interval-toggle'), value);
            }
          });

          const positives = Object.values(session.intervals).filter(v => v === '+').length;
          const pct       = Math.round((positives / 10) * 100);
          const countEl   = block.querySelector(`[data-session-total="${idx}"]`);
          const pctEl     = block.querySelector(`[data-session-pct="${idx}"]`);
          if (countEl) countEl.textContent = positives;
          if (pctEl)   pctEl.textContent   = pct + '%';
        }

        grid.appendChild(block);
      });

      sessionCount = result.sessions.length;
      document.getElementById('bdmSessionCount').textContent =
        `${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;

      showBdmNotification('BDM data loaded', 'success');
    }

    if (result.notes) {
      const notesInput = document.getElementById('bdmNotesInput');
      if (notesInput) notesInput.value = result.notes;
    }

  } catch (err) {
    console.error('BDM Load error:', err);
  }
}

function showBdmNotification(message, type) {
  const existing = document.querySelector('.bdm-notification-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className  = 'bdm-notification-toast';
  toast.style.cssText = `
    position:fixed; top:80px; right:20px;
    padding:12px 20px; border-radius:8px;
    font-family:var(--ff-body); font-size:13px; font-weight:500;
    z-index:9999; animation:slideIn .3s ease;
    background:${type === 'success' ? '#10b981' : '#ef4444'};
    color:#fff; box-shadow:0 4px 12px rgba(0,0,0,.15);
    max-width:320px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


// =============================================================
// BDM TABLE UI (tab switching + session block builder)
// Must run after DOM is ready — uses DOMContentLoaded guard
// =============================================================
document.addEventListener('DOMContentLoaded', function () {

  // ── Tab switching ─────────────────────────────────────────────
  document.querySelectorAll('.measurement-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.measurement-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.measurement-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
    });
  });

  // ── BDM state ─────────────────────────────────────────────────
  const NUM_INTERVALS = 10;
  const grid = document.getElementById('bdmSessionsGrid');
  window.sessionCount = 1;         // exposed so loadBdmFromDatabase can update it
  window.sessionData  = {};        // exposed so loadBdmFromDatabase can write intervals

  // ── Session block builder ─────────────────────────────────────
  window.createSessionBlock = function createSessionBlock(idx) {
    sessionData[idx] = Array(NUM_INTERVALS).fill('');

    const block = document.createElement('div');
    block.className         = 'bdm-session-block';
    block.dataset.sessionIdx = idx;

    const heading = document.createElement('div');
    heading.className = 'bdm-session-heading';
    heading.innerHTML = `
      <span class="bdm-session-label">Session #</span>
      <input class="bdm-session-num-input" type="text" placeholder="__" maxlength="3" />
    `;
    block.appendChild(heading);

    const container = document.createElement('div');
    container.className = 'bdm-table-container';

    const table = document.createElement('table');
    table.className = 'bdm-table';

    let thIntervals = '';
    for (let i = 1; i <= NUM_INTERVALS; i++) {
      thIntervals += `<th class="col-interval">${i}</th>`;
    }
    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-date">Date</th>
          <th class="col-plusminus">(+/−)</th>
          <th colspan="${NUM_INTERVALS}" style="text-align:center; border-right:1px solid rgba(0,0,0,0.12);">Interval #</th>
          <th class="col-total">Total Times Behavior Observed</th>
        </tr>
        <tr>
          <th class="col-date"></th>
          <th class="col-plusminus"></th>
          ${thIntervals}
          <th class="col-total"></th>
        </tr>
      </thead>
    `;

    const tbody   = document.createElement('tbody');
    const mainRow = document.createElement('tr');

    let cells = `<td><input class="bdm-cell-input date-input" type="text" placeholder="MM/DD/YYYY" /></td>`;
    cells    += `<td class="plusminus-cell" style="font-size:11px; color:#999; padding:0 6px;">(+/−)</td>`;
    for (let i = 0; i < NUM_INTERVALS; i++) {
      cells += `
        <td class="interval-cell" data-session="${idx}" data-interval="${i}">
          <div class="interval-toggle empty"></div>
        </td>`;
    }
    cells += `
      <td class="total-cell">
        <div class="total-formula">
          [(<span class="total-count" data-session-total="${idx}">0</span>
          &nbsp;<span class="total-divider">/ ${NUM_INTERVALS})</span>&nbsp;×&nbsp;100]&nbsp;=&nbsp;
          <span class="total-pct" data-session-pct="${idx}">0%</span>]
        </div>
      </td>`;
    mainRow.innerHTML = cells;
    tbody.appendChild(mainRow);

    mainRow.querySelectorAll('.interval-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const si     = parseInt(cell.dataset.session);
        const ii     = parseInt(cell.dataset.interval);
        const states = ['', '+', '-'];
        const next   = states[(states.indexOf(sessionData[si][ii]) + 1) % states.length];
        sessionData[si][ii] = next;
        updateToggleCell(cell.querySelector('.interval-toggle'), next);
        const positives = sessionData[si].filter(s => s === '+').length;
        const pct       = Math.round((positives / NUM_INTERVALS) * 100);
        const countEl   = block.querySelector(`[data-session-total="${si}"]`);
        const pctEl     = block.querySelector(`[data-session-pct="${si}"]`);
        if (countEl) countEl.textContent = positives;
        if (pctEl)   pctEl.textContent   = pct + '%';
      });
    });

    table.appendChild(tbody);
    container.appendChild(table);
    block.appendChild(container);

    const hr = document.createElement('hr');
    hr.className = 'section-divider';
    block.appendChild(hr);

    return block;
  };

  window.updateToggleCell = function updateToggleCell(el, state) {
    el.className   = 'interval-toggle';
    el.textContent = '';
    if      (state === '+') { el.classList.add('positive'); el.textContent = '+'; }
    else if (state === '-') { el.classList.add('negative'); el.textContent = '−'; }
    else                    { el.classList.add('empty'); }
  };

  function updateBdmSessionCount() {
    document.getElementById('bdmSessionCount').textContent =
      `${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
  }

  document.getElementById('bdmAddSession').addEventListener('click', () => {
    sessionCount++;
    grid.appendChild(createSessionBlock(sessionCount - 1));
    updateBdmSessionCount();
  });

  document.getElementById('bdmDeleteSession').addEventListener('click', () => {
    if (sessionCount > 1) {
      const blocks = grid.querySelectorAll('.bdm-session-block');
      if (blocks.length > 0) {
        blocks[blocks.length - 1].remove();
        sessionCount--;
        updateBdmSessionCount();
      }
    }
  });

  document.getElementById('bdmSave').addEventListener('click', () => {
    if (typeof saveBdmToDatabase === 'function') saveBdmToDatabase();
  });

  // Render initial blank session
  grid.appendChild(createSessionBlock(0));
  updateBdmSessionCount();
});