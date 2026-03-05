(function() {
  const FUNCTIONS = ['Sensory', 'Escape', 'Attention', 'Tangible'];
  let SESSIONS = 3;
  let sessionCountEl;
  let isLoadingData = false;
  let currentClientId = null;

  // ── Expose client ID globally so BDM functions can read it ──
  // This replaces the broken getClientId() approach
  Object.defineProperty(window, 'ATRP_CLIENT_ID', {
    get: () => currentClientId,
    set: (v) => { currentClientId = v; },
    configurable: true
  });

  // ============================================
  // CLIENT MANAGEMENT
  // ============================================
  
  async function loadClients() {
    try {
      const response = await fetch('../php/api_clients.php');
      const result = await response.json();
      if (result.success && result.clients) return result.clients;
      return [];
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  }
  
  async function saveClient(clientData) {
    try {
      const response = await fetch('../php/api_clients.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error saving client:', error);
      return { success: false, error: error.message };
    }
  }
  
  function populateClientDropdown(clients) {
    const nameInput = document.getElementById('clientName');
    if (!nameInput) return;
    
    let dropdown = document.getElementById('clientDropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'clientDropdown';
      dropdown.className = 'client-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        z-index: 1000;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
        display: none;
        width: 100%;
        left: 0;
        top: 100%;
      `;
      
      const inputWrapper = document.createElement('div');
      inputWrapper.style.position = 'relative';
      nameInput.parentNode.insertBefore(inputWrapper, nameInput);
      inputWrapper.appendChild(nameInput);
      inputWrapper.appendChild(dropdown);
      
      nameInput.addEventListener('input', () => filterClients(clients, nameInput.value));
      nameInput.addEventListener('focus', () => filterClients(clients, nameInput.value));
      document.addEventListener('click', (e) => {
        if (!inputWrapper.contains(e.target)) dropdown.style.display = 'none';
      });
    }
    
    dropdown.clientsData = clients;
    if (!nameInput.value) filterClients(clients, '');
  }
  
  function filterClients(clients, searchTerm) {
    const dropdown = document.getElementById('clientDropdown');
    if (!dropdown) return;
    
    const filtered = clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filtered.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = filtered.map(c => `
      <div class="client-option" data-id="${c.id}" data-name="${c.full_name}"
           style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;">
        ${c.full_name}
      </div>
    `).join('');
    
    dropdown.querySelectorAll('.client-option').forEach(option => {
      option.addEventListener('click', () => {
        selectClient(parseInt(option.dataset.id), option.dataset.name);
      });
    });

    dropdown.style.display = 'block';
  }
  
  function selectClient(id, fullName) {
    currentClientId = id;
    window.ATRP_CLIENT_ID = id; // keep the global in sync explicitly too

    const nameInput = document.getElementById('clientName');
    if (nameInput) nameInput.value = fullName || '';
    
    const dropdown = document.getElementById('clientDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    // Load BCM data for this client
    loadClientInfo(id);
    loadFromDatabase();

    // Load BDM data for this client now that client_id is set
    if (typeof loadBdmFromDatabase === 'function') {
      loadBdmFromDatabase();
    }
  }

  // ============================================
  // CLIENT INFO LOAD/SAVE
  // ============================================
  
  async function loadClientInfo(clientId) {
    try {
      const response = await fetch('../php/api_clients.php?client_id=' + clientId);
      const result = await response.json();
      
      if (result.success && result.client) {
        const client = result.client;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('clientAge',        client.age);
        set('clientDiagnosis',  client.diagnosis);
        set('clientRecorder',   client.recorder);
        set('reportStartDate',  client.report_start_date);
        set('reportEndDate',    client.report_end_date);
      }
    } catch (error) {
      console.error('Error loading client info:', error);
    }
  }

  async function saveClientInfo(clientId) {
    try {
      const get = (id) => document.getElementById(id)?.value || null;
      const response = await fetch('../php/api_clients.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:         clientId,
          age:               get('clientAge'),
          diagnosis:         get('clientDiagnosis'),
          recorder:          get('clientRecorder'),
          report_start_date: get('reportStartDate'),
          report_end_date:   get('reportEndDate')
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error saving client info:', error);
      return { success: false, error: error.message };
    }
  }
  
  // ============================================
  // DATABASE API FUNCTIONS
  // ============================================
  
  async function saveToDatabase() {
    const saveBtn = document.getElementById('bcmSave');
    if (saveBtn) {
      saveBtn.classList.add('saving');
      saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="20" stroke-dashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite"/></circle></svg> Saving...';
    }

    try {
      const nameValue = document.getElementById('clientName')?.value?.trim() || '';
      if (!nameValue) {
        showNotification('Please enter a client name', 'error');
        return;
      }

      let clientId = currentClientId;
      
      if (!clientId) {
        const get = (id) => document.getElementById(id)?.value || null;
        const clientResult = await saveClient({
          full_name:         nameValue,
          age:               get('clientAge'),
          diagnosis:         get('clientDiagnosis'),
          recorder:          get('clientRecorder'),
          report_start_date: get('reportStartDate'),
          report_end_date:   get('reportEndDate')
        });
        
        if (clientResult.success && clientResult.id) {
          clientId = clientResult.id;
          currentClientId = clientId;
          window.ATRP_CLIENT_ID = clientId; // keep global in sync
        } else {
          showNotification('Error creating client: ' + (clientResult.error || 'Unknown error'), 'error');
          return;
        }
      }
      
      await saveClientInfo(clientId);
      
      // Gather behaviors
      const behaviors = [];
      document.querySelectorAll('#bcmTableBody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const behavior = {
          antecedent: cells[0]?.querySelector('.cell-input')?.value || '',
          behavior:   cells[1]?.querySelector('.cell-input')?.value || '',
          sessions:   {},
          functions:  {}
        };
        row.querySelectorAll('.freq-display').forEach((display, index) => {
          behavior.sessions[index + 1] = parseInt(display.value) || 0;
        });
        const checkboxes = row.querySelectorAll('.fn-check input[type="checkbox"]');
        const fnLabels   = row.querySelectorAll('.fn-label');
        checkboxes.forEach((cb, index) => {
          if (fnLabels[index]) behavior.functions[fnLabels[index].textContent] = cb.checked;
        });
        behaviors.push(behavior);
      });
      
      const notes = document.getElementById('notesInput')?.value || '';
      const sessionNumbers = [];
      document.querySelectorAll('.bcm-table thead .session-num').forEach(input => {
        sessionNumbers.push(parseInt(input.value) || 0);
      });

      const response = await fetch('../php/api_bcm.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, behaviors, sessions: sessionNumbers, notes })
      });
      
      const result = await response.json();
      if (result.success) {
        showNotification('Data saved successfully!', 'success');
      } else {
        showNotification('Error saving data: ' + result.error, 'error');
      }
      
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Failed to connect to database', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.classList.remove('saving');
        saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 7.5l-4 4-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Save';
      }
    }
  }

  async function loadFromDatabase() {
    if (isLoadingData) return;
    isLoadingData = true;
    
    try {
      let url = '../php/api_bcm.php';
      if (currentClientId) url += '?client_id=' + currentClientId;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && result.behaviors && result.behaviors.length > 0) {
        const tbody = document.getElementById('bcmTableBody');
        tbody.innerHTML = '';
        
        let maxSessions = 0;
        result.behaviors.forEach(b => {
          if (b.sessions) {
            const keys = Object.keys(b.sessions).map(k => parseInt(k));
            maxSessions = Math.max(maxSessions, ...keys);
          }
        });
        if (maxSessions > 0) {
          while (SESSIONS < maxSessions) addSessionColumn();
        }
        
        result.behaviors.forEach(behavior => {
          const row = createRow();
          const cells = row.querySelectorAll('td');
          const antecedentInput = cells[0]?.querySelector('.cell-input');
          const behaviorInput   = cells[1]?.querySelector('.cell-input');
          if (antecedentInput) antecedentInput.value = behavior.antecedent || '';
          if (behaviorInput)   behaviorInput.value   = behavior.behavior   || '';
          
          row.querySelectorAll('.freq-display').forEach((display, index) => {
            if (behavior.sessions?.[index + 1] !== undefined) {
              display.value = behavior.sessions[index + 1];
            }
          });
          
          const checkboxes = row.querySelectorAll('.fn-check input[type="checkbox"]');
          const fnLabels   = row.querySelectorAll('.fn-label');
          checkboxes.forEach((cb, index) => {
            if (fnLabels[index] && behavior.functions) {
              cb.checked = behavior.functions[fnLabels[index].textContent] || false;
            }
          });
          
          tbody.appendChild(row);
          rows++;
        });
        
        const rowCount = document.getElementById('rowCount');
        if (rowCount) rowCount.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';
        
        const notesInput = document.getElementById('notesInput');
        if (notesInput && result.notes) notesInput.value = result.notes;
        
        showNotification('Data loaded from database', 'success');
      } else if (currentClientId) {
        const tbody = document.getElementById('bcmTableBody');
        if (tbody && tbody.children.length === 0) {
          tbody.appendChild(createRow());
          rows = 1;
        }
      }
      
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      isLoadingData = false;
    }
  }

  function showNotification(message, type) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
      position: fixed; top: 80px; right: 20px;
      padding: 12px 20px; border-radius: 8px;
      font-family: var(--ff-body); font-size: 13px; font-weight: 500;
      z-index: 1000; animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `;
  document.head.appendChild(style);

  // ============================================
  // TABLE FUNCTIONS
  // ============================================

  function createSessionHeader() {
    const thead = document.querySelector('.bcm-table thead tr');
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
    const tdS = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'freq-cell';
    const display = document.createElement('input');
    display.className = 'freq-display';
    display.type = 'number';
    display.value = '0';
    display.min = '0';
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
      count = parseInt(display.value) || 0;
      if (count < 0) { count = 0; display.value = 0; }
    });
    div.appendChild(minus);
    div.appendChild(display);
    div.appendChild(plus);
    tdS.appendChild(div);
    return tdS;
  }

  function addSessionColumn() {
    SESSIONS++;
    createSessionHeader();
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
      tr.insertBefore(createFreqCell(), tr.querySelector('td:last-child'));
    });
    updateSessionCount();
  }

  function deleteSessionColumn() {
    if (SESSIONS <= 1) return;
    SESSIONS--;
    const headerCells = document.querySelectorAll('.bcm-table thead tr .col-session');
    if (headerCells.length > 1) headerCells[headerCells.length - 1].remove();
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
      const freqCells = tr.querySelectorAll('.freq-cell');
      if (freqCells.length > 1) freqCells[freqCells.length - 1].parentElement.remove();
    });
    updateSessionCount();
  }

  function updateSessionCount() {
    if (sessionCountEl) {
      sessionCountEl.textContent = ' | ' + SESSIONS + ' session' + (SESSIONS !== 1 ? 's' : '');
    }
  }

  function createRow() {
    const tr = document.createElement('tr');
    const tdA = document.createElement('td');
    const taA = document.createElement('textarea');
    taA.className = 'cell-input';
    taA.placeholder = 'Describe antecedent…';
    tdA.appendChild(taA);
    tr.appendChild(tdA);
    const tdB = document.createElement('td');
    const taB = document.createElement('textarea');
    taB.className = 'cell-input';
    taB.placeholder = 'Describe behavior…';
    tdB.appendChild(taB);
    tr.appendChild(tdB);
    for (let s = 0; s < SESSIONS; s++) tr.appendChild(createFreqCell());
    const tdF = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'function-cell';
    FUNCTIONS.forEach(fn => {
      const label = document.createElement('label');
      label.className = 'fn-check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      const box = document.createElement('span');
      box.className = 'fn-box';
      const text = document.createElement('span');
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

  // ============================================
  // INITIALIZATION
  // ============================================

  const tbody = document.getElementById('bcmTableBody');
  const rowCount = document.getElementById('rowCount');
  sessionCountEl = document.getElementById('sessionCount');
  let rows = 1;

  for (let i = 0; i < rows; i++) tbody.appendChild(createRow());
  updateSessionCount();

  document.querySelector('.bcm-btn-save')?.addEventListener('click', saveToDatabase);
  document.querySelector('.bcm-btn-add-session').addEventListener('click', addSessionColumn);
  document.querySelector('.bcm-btn-delete-session').addEventListener('click', deleteSessionColumn);
  document.querySelector('.bcm-btn-add').addEventListener('click', () => {
    tbody.appendChild(createRow());
    rows++;
    rowCount.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';
  });
  document.querySelector('.bcm-btn-delete').addEventListener('click', () => {
    if (rows > 1) {
      tbody.removeChild(tbody.lastChild);
      rows--;
      rowCount.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';
    }
  });

  async function initApp() {
    const clients = await loadClients();
    populateClientDropdown(clients);
    loadFromDatabase();
  }
  
  initApp();

})();


// ============================================
// BDM FUNCTIONS
// These run outside the IIFE and read
// window.ATRP_CLIENT_ID set above.
// ============================================

function getClientId() {
  // Reads from the live getter defined in the IIFE above
  return window.ATRP_CLIENT_ID || null;
}

async function saveBdmToDatabase() {
  const client_id = getClientId();
  if (!client_id) {
    showBdmNotification('Please select a client before saving.', 'error');
    return;
  }

  const saveBtn = document.getElementById('bdmSave');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    const sessions = [];
    const NUM_INTERVALS = 10;

    document.querySelectorAll('.bdm-session-block').forEach((block, blockIndex) => {
      const dateInput       = block.querySelector('.date-input');
      const sessionNumInput = block.querySelector('.bdm-session-num-input');

      const session = {
        session_number : parseInt(sessionNumInput?.value) || (blockIndex + 1),
        session_date   : dateInput?.value || '',
        interval_count : NUM_INTERVALS,
        intervals      : {}
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

    const response = await fetch('../php/api_bdm.php', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({ client_id, sessions, notes })
    });

    const result = await response.json();
    if (result.success) {
      showBdmNotification(`Saved ${result.sessions_saved} session(s) successfully!`, 'success');
    } else {
      showBdmNotification('Error: ' + result.error, 'error');
    }

  } catch (err) {
    console.error('BDM Save error:', err);
    showBdmNotification('Failed to connect to database', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M11.5 7.5l-4 4-3-3" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/></svg> Save`;
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
      // Reset the outer sessionCount used by BDM panel
      if (typeof window.bdmSessionCount !== 'undefined') window.bdmSessionCount = 0;

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

      // Sync the session counter shown in the footer
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
  toast.className = 'bdm-notification-toast';
  toast.style.cssText = `
    position: fixed; top: 80px; right: 20px;
    padding: 12px 20px; border-radius: 8px;
    font-family: var(--ff-body); font-size: 13px; font-weight: 500;
    z-index: 1000; animation: slideIn 0.3s ease;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}



 /* ── BDM TABLE── */
    /* ── Tab switching ── */
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

    /* ── BDM UI State ── */
    const NUM_INTERVALS = 10;
    const grid = document.getElementById('bdmSessionsGrid');
    let sessionCount = 1;
    const sessionData = {};

    /* ── Notification helper (used by table.js BDM functions too) ── */
    function showBdmNotification(message, type) {
      const existing = document.querySelector('.bdm-notification-toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'bdm-notification-toast';
      toast.style.cssText = `
        position: fixed; top: 80px; right: 20px;
        padding: 12px 20px; border-radius: 8px;
        font-family: var(--ff-body); font-size: 13px; font-weight: 500;
        z-index: 1000; animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    /* ── Session block builder ── */
    function createSessionBlock(idx) {
      sessionData[idx] = Array(NUM_INTERVALS).fill('');

      const block = document.createElement('div');
      block.className = 'bdm-session-block';
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

      const tbody = document.createElement('tbody');
      const mainRow = document.createElement('tr');

      let cells = `<td><input class="bdm-cell-input date-input" type="text" placeholder="MM/DD/YYYY" /></td>`;
      cells += `<td class="plusminus-cell" style="font-size:11px; color:#999; padding:0 6px;">(+/−)</td>`;
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
          const si = parseInt(cell.dataset.session);
          const ii = parseInt(cell.dataset.interval);
          const states = ['', '+', '-'];
          const next = states[(states.indexOf(sessionData[si][ii]) + 1) % states.length];
          sessionData[si][ii] = next;
          updateToggleCell(cell.querySelector('.interval-toggle'), next);
          const positives = sessionData[si].filter(s => s === '+').length;
          const pct = Math.round((positives / NUM_INTERVALS) * 100);
          const countEl = block.querySelector(`[data-session-total="${si}"]`);
          const pctEl   = block.querySelector(`[data-session-pct="${si}"]`);
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
    }

    function updateToggleCell(el, state) {
      el.className = 'interval-toggle';
      el.textContent = '';
      if (state === '+')      { el.classList.add('positive'); el.textContent = '+'; }
      else if (state === '-') { el.classList.add('negative'); el.textContent = '−'; }
      else                    { el.classList.add('empty'); }
    }

    function updateSessionCount() {
      document.getElementById('bdmSessionCount').textContent =
        `${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
    }

    document.getElementById('bdmAddSession').addEventListener('click', () => {
      sessionCount++;
      grid.appendChild(createSessionBlock(sessionCount - 1));
      updateSessionCount();
    });

    document.getElementById('bdmDeleteSession').addEventListener('click', () => {
      if (sessionCount > 1) {
        const blocks = grid.querySelectorAll('.bdm-session-block');
        if (blocks.length > 0) {
          blocks[blocks.length - 1].remove();
          sessionCount--;
          updateSessionCount();
        }
      }
    });

    // Wire Save button — delegates to table.js function after it loads
    document.getElementById('bdmSave').addEventListener('click', () => {
      if (typeof saveBdmToDatabase === 'function') {
        saveBdmToDatabase();
      }
    });

    // Render initial empty session
    grid.appendChild(createSessionBlock(0));
    updateSessionCount();