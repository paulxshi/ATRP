(function() {
  const FUNCTIONS = ['Sensory', 'Escape', 'Attention', 'Tangible'];
  let SESSIONS = 3;
  let sessionCountEl;

  function createSessionHeader() {
    const thead = document.querySelector('.bcm-table thead tr');
    const functionTh = thead.querySelector('.col-function');
    
    // Add session header
    const th = document.createElement('th');
    th.className = 'col-session';
    th.innerHTML = `
      <span class="session-label">Session</span>
      <input class="session-num" type="text" placeholder="__" maxlength="3" />
      <span class="session-sub">Freq.</span>
    `;
    thead.insertBefore(th, functionTh);
  }

  function addSessionColumn() {
    SESSIONS++;
    
    // Add header
    createSessionHeader();
    
    // Add cell to each row
    document.querySelectorAll('#bcmTableBody tr').forEach(tr => {
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
      
      // Insert before Function column
      const functionTd = tr.querySelector('.function-cell');
      if (functionTd) {
        tr.insertBefore(tdS, functionTd);
      }
    });

    updateSessionCount();
  }

  function updateSessionCount() {
    if (sessionCountEl) {
      sessionCountEl.textContent = SESSIONS + ' session' + (SESSIONS !== 1 ? 's' : '');
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

    // Session frequencies
    for (let s = 0; s < SESSIONS; s++) {
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
      tr.appendChild(tdS);
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

  const tbody = document.getElementById('bcmTableBody');
  const rowCount = document.getElementById('rowCount');
  sessionCountEl = document.getElementById('sessionCount');
  let rows = 1;

  for (let i = 0; i < rows; i++) tbody.appendChild(createRow());

  document.querySelector('.bcm-btn-add-session').addEventListener('click', () => {
    addSessionColumn();
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
})();