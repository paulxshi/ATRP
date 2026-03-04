(function() {
  const FUNCTIONS = ['Sensory', 'Escape', 'Attention', 'Tangible'];
  let SESSIONS = 3;
  let sessionCountEl;
  let isLoadingData = false;

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
      // Gather all data from the table
      const behaviors = [];
      const rows = document.querySelectorAll('#bcmTableBody tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const behavior = {
          antecedent: cells[0]?.querySelector('.cell-input')?.value || '',
          behavior: cells[1]?.querySelector('.cell-input')?.value || '',
          sessions: {},
          functions: {}
        };
        
        // Get session frequencies (columns 2 onwards, before function column)
        const freqDisplays = row.querySelectorAll('.freq-display');
        freqDisplays.forEach((display, index) => {
          behavior.sessions[index + 1] = parseInt(display.value) || 0;
        });
        
        // Get function checkboxes
        const checkboxes = row.querySelectorAll('.fn-check input[type="checkbox"]');
        const fnLabels = row.querySelectorAll('.fn-label');
        checkboxes.forEach((cb, index) => {
          if (fnLabels[index]) {
            behavior.functions[fnLabels[index].textContent] = cb.checked;
          }
        });
        
        behaviors.push(behavior);
      });
      
      // Get notes
      const notesInput = document.getElementById('notesInput');
      const notes = notesInput?.value || '';
      
      // Send to server
      const response = await fetch('php/api_bcm.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          behaviors: behaviors,
          notes: notes
        })
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
      const response = await fetch('php/api_bcm.php');
      const result = await response.json();
      
      if (result.success && result.behaviors && result.behaviors.length > 0) {
        // Clear existing rows first
        const tbody = document.getElementById('bcmTableBody');
        tbody.innerHTML = '';
        
        // Adjust sessions based on loaded data
        let maxSessions = 0;
        result.behaviors.forEach(b => {
          if (b.sessions) {
            const sessionKeys = Object.keys(b.sessions).map(k => parseInt(k));
            maxSessions = Math.max(maxSessions, ...sessionKeys);
          }
        });
        
        if (maxSessions > 0) {
          // Update session count and headers
          while (SESSIONS < maxSessions) {
            addSessionColumn();
          }
        }
        
        // Add rows for each behavior
        result.behaviors.forEach(behavior => {
          const row = createRow();
          
          // Set antecedent and behavior
          const cells = row.querySelectorAll('td');
          const antecedentInput = cells[0]?.querySelector('.cell-input');
          const behaviorInput = cells[1]?.querySelector('.cell-input');
          if (antecedentInput) antecedentInput.value = behavior.antecedent || '';
          if (behaviorInput) behaviorInput.value = behavior.behavior || '';
          
          // Set session frequencies
          const freqDisplays = row.querySelectorAll('.freq-display');
          freqDisplays.forEach((display, index) => {
            const sessionNum = index + 1;
            if (behavior.sessions && behavior.sessions[sessionNum] !== undefined) {
              display.value = behavior.sessions[sessionNum];
            }
          });
          
          // Set function checkboxes
          const checkboxes = row.querySelectorAll('.fn-check input[type="checkbox"]');
          const fnLabels = row.querySelectorAll('.fn-label');
          checkboxes.forEach((cb, index) => {
            if (fnLabels[index] && behavior.functions) {
              cb.checked = behavior.functions[fnLabels[index].textContent] || false;
            }
          });
          
          tbody.appendChild(row);
          rows++;
        });
        
        // Update row count display
        const rowCount = document.getElementById('rowCount');
        if (rowCount) {
          rowCount.textContent = rows + ' behavior' + (rows !== 1 ? 's' : '') + ' tracked';
        }
        
        // Load notes
        const notesInput = document.getElementById('notesInput');
        if (notesInput && result.notes) {
          notesInput.value = result.notes;
        }
        
        showNotification('Data loaded from database', 'success');
      }
      
    } catch (error) {
      console.error('Load error:', error);
      // Silently fail - don't show error on initial load if no data exists
    } finally {
      isLoadingData = false;
    }
  }

  function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: var(--ff-body);
      font-size: 13px;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
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
    minus.addEventListener('click', () => {
      if (count > 0) { count--; display.value = count; }
    });

    const plus = document.createElement('button');
    plus.className = 'freq-btn';
    plus.textContent = '+';
    plus.addEventListener('click', () => {
      count++;
      display.value = count;
    });

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

    // Add header
    createSessionHeader();

    // Add freq cell to each existing body row, before the function td
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
      const functionTd = tr.querySelector('td:last-child');
      tr.insertBefore(createFreqCell(), functionTd);
    });

    updateSessionCount();
  }

  function deleteSessionColumn() {
    if (SESSIONS <= 1) return;

    SESSIONS--;

    // Remove the header cell (second-to-last before function)
    const thead = document.querySelector('.bcm-table thead tr');
    const headerCells = thead.querySelectorAll('.col-session');
    if (headerCells.length > 1) {
      headerCells[headerCells.length - 1].remove();
    }

    // Remove freq cell from each body row
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
      const freqCells = tr.querySelectorAll('.freq-cell');
      if (freqCells.length > 1) {
        freqCells[freqCells.length - 1].parentElement.remove();
      }
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

    // Antecedent
    const tdA = document.createElement('td');
    const taA = document.createElement('textarea');
    taA.className = 'cell-input';
    taA.placeholder = 'Describe antecedent…';
    tdA.appendChild(taA);
    tr.appendChild(tdA);

    // Problem Behavior
    const tdB = document.createElement('td');
    const taB = document.createElement('textarea');
    taB.className = 'cell-input';
    taB.placeholder = 'Describe behavior…';
    tdB.appendChild(taB);
    tr.appendChild(tdB);

    // Session frequency cells
    for (let s = 0; s < SESSIONS; s++) {
      tr.appendChild(createFreqCell());
    }

    // Function checkboxes
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

  // Init: build header session columns + first row
  // The HTML already has 3 session <th>s, so we just render the first row
  for (let i = 0; i < rows; i++) tbody.appendChild(createRow());
  updateSessionCount();

  // Event Listeners
  document.querySelector('.bcm-btn-save')?.addEventListener('click', saveToDatabase);

  document.querySelector('.bcm-btn-add-session').addEventListener('click', () => {
    addSessionColumn();
  });

  document.querySelector('.bcm-btn-delete-session').addEventListener('click', () => {
    deleteSessionColumn();
  });

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

  // Load data from database on page load
  loadFromDatabase();

})();
