(function () {
  'use strict';

  // Sub-domain map - shared across all skill scoring pages
  window.ATRP_SUB_DOMAINS = {
    'Communication': ['Receptive', 'Expressive'],
    'Daily Living':  ['Personal', 'Domestic', 'Community'],
    'Socialization': ['Interpersonal Relationship', 'Play and Leisure', 'Coping Skills']
  };

  // Subskills legend map with colors
  window.ATRP_SUBSKILLS = {
    'Communication': {
      'Receptive': [
        { name: 'Eye Contact', color: '#1447e6' },
        { name: 'Basic Understanding', color: '#00c950' },
        { name: 'Identification', color: '#facc15' },
        { name: 'Advanced Understanding', color: '#86198f' }
      ],
      'Expressive': [
        { name: 'Simple Communication', color: '#1447e6' },
        { name: 'Personal Information', color: '#00c950' },
        { name: 'Descriptive Communication', color: '#facc15' },
        { name: 'Comprehensive Communication', color: '#86198f' }
      ]
    },
    'Daily Living': {
      'Personal': [
        { name: 'Preschool Age', color: '#1447e6' },
        { name: 'Elementary Age', color: '#00c950' },
        { name: 'Pre-adolescent Age', color: '#facc15' }
      ],
      'Domestic':    [{ name: '(to follow)', color: '#999' }],
      'Community':   [{ name: '(to follow)', color: '#999' }]
    },
    'Socialization': {
      'default': [{ name: '(to follow)', color: '#999' }]
    }
  };

  // Summary title map
  window.ATRP_SUMMARY_TITLES = {
    'Communication': {
      'Receptive': 'Receptive Communication Summary',
      'Expressive': 'Expressive Communication Summary'
    },
    'Daily Living': {
      'Personal': 'Personal Care Summary',
      'Domestic': 'Domestic Skills Summary',
      'Community': 'Community Skills Summary'
    },
    'Socialization': {
      'default': 'Socialization Summary'
    }
  };

  const TIERS = [
    { key: 'eye',   label: 'Eye Contact',            color: '#1447e6', cls: 't-eye'   },
    { key: 'basic', label: 'Basic Understanding',    color: '#00c950', cls: 't-basic' },
    { key: 'ident', label: 'Identification',         color: '#facc15', cls: 't-ident' },
    { key: 'adv',   label: 'Advanced Understanding', color: '#86198f', cls: 't-adv'   },
  ];

  // Drill options for each subskill
  const DRILL_OPTIONS = {
    'Eye Contact': ['Look at Speaker', 'Follow Gaze', 'Look at Object', 'Respond to Name'],
    'Basic Understanding': ['Respond to Instructions', 'Understand Gestures', 'Identify Objects', 'Match Pictures'],
    'Identification': ['Point to Pictures', 'Select Correct Item', 'Match to Sample', 'Sort by Category'],
    'Advanced Understanding': ['Follow Multi-step', 'Understand Sentences', 'Answer Wh-Questions', 'Sequence Events'],
    'Simple Communication': ['Request Items', 'Request Activities', 'Indicate Preferences', 'Name Objects'],
    'Personal Information': ['Say Name', 'Say Age', 'Say Address', 'Say Phone Number'],
    'Descriptive Communication': ['Label Objects', 'Describe Actions', 'Use Adjectives', 'Describe Colors'],
    'Comprehensive Communication': ['Tell Stories', 'Explain Procedures', 'Answer Questions', 'Retell Events'],
    'Preschool Age': ['Wash Hands', 'Brush Teeth', 'Dress Self', 'Use Toilet'],
    'Elementary Age': ['Prepare Snacks', 'Brush Hair', 'Tie Shoes', 'Organize Belongings'],
    'Pre-adolescent Age': ['Manage Hygiene', 'Plan Meals', 'Follow Routines', 'Independent Living Skills']
  };

  function getActiveTiers() {
    const customSubskills = window.ATRP_CURRENT_SUBSKILLS;
    if (customSubskills && customSubskills.length > 0) {
      return customSubskills.map((s, idx) => ({
        key: 'subskill-' + idx,
        label: s.name,
        color: s.color || '#999',
        cls: 't-custom-' + idx
      }));
    }
    return TIERS;
  }

  let DRILLS = [
    { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' },
    { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' },
  ];

  let currentClientId   = null;
  let currentClientName = '';
  let isSaving          = false;

  function resolveClient() {
    const id = window.ATRP_CLIENT_ID || null;
    if (id) {
      currentClientId   = id;
      const nameEl      = document.getElementById('clientName');
      currentClientName = nameEl ? (nameEl.value || 'Client #' + id) : 'Client #' + id;
      // CHANGE 1: Only update the banner — do NOT auto-load data from the database
      updateClientBanner();
    } else {
      updateClientBanner();
    }
  }

  let _pollCount = 0;
  function pollForClient() {
    if (window.ATRP_CLIENT_ID) {
      resolveClient();
    } else if (_pollCount < 20) {
      _pollCount++;
      setTimeout(pollForClient, 150);
    } else {
      updateClientBanner();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLIENT BANNER
  // ─────────────────────────────────────────────────────────────
  function updateClientBanner() {
    if (!document.getElementById('_skillBannerStyles')) {
      const s = document.createElement('style');
      s.id = '_skillBannerStyles';
      s.textContent = `
        #skillClientBanner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 22px;
          background: linear-gradient(135deg, #fdfaf4 0%, #faf7ed 100%);
          border-bottom: 1.5px solid rgba(201,168,76,.18);
          font-family: var(--ff-body); gap: 12px;
        }
        .scb-left { display: flex; align-items: center; gap: 12px; }
        .scb-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #C9A84C, #e8ca7a);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 2px 8px rgba(201,168,76,.35);
        }
        .scb-avatar svg { width: 18px; height: 18px; }
        .scb-info { display: flex; flex-direction: column; gap: 1px; }
        .scb-eyebrow { font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #C9A84C; }
        .scb-name { font-size: 14px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
        .scb-empty-text { font-size: 13px; font-weight: 500; color: #aaa; }
        .scb-change-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 16px; background: transparent;
          border: 1.5px solid rgba(201,168,76,.4); border-radius: 8px;
          font-family: var(--ff-body); font-size: 12px; font-weight: 600;
          color: #7a5c1e; cursor: pointer;
          transition: background .18s, border-color .18s, transform .12s, box-shadow .18s;
          white-space: nowrap; flex-shrink: 0;
        }
        .scb-change-btn:hover { background: rgba(201,168,76,.10); border-color: #C9A84C; box-shadow: 0 2px 8px rgba(201,168,76,.2); transform: translateY(-1px); }
        .scb-select-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 20px; background: #1a1a1a;
          border: none; border-radius: 9px;
          font-family: var(--ff-body); font-size: 12.5px; font-weight: 700;
          color: #fff; cursor: pointer; letter-spacing: .02em;
          transition: background .18s, transform .12s, box-shadow .18s;
          white-space: nowrap; flex-shrink: 0;
          box-shadow: 0 3px 12px rgba(0,0,0,.18);
        }
        .scb-select-btn:hover { background: #333; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,.22); }
        .scb-select-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
      `;
      document.head.appendChild(s);
    }

    let banner = document.getElementById('skillClientBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'skillClientBanner';
      const card = document.querySelector('.measurement-container');
      if (card) card.insertBefore(banner, card.firstChild);
    }

    if (currentClientId) {
      banner.innerHTML = `
        <div class="scb-left">
          <div class="scb-avatar">
            <svg viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="4" fill="rgba(255,255,255,.9)"/>
              <path d="M3 18c0-4 3.1-6 7-6s7 2 7 6" stroke="rgba(255,255,255,.9)" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="scb-info">
            <span class="scb-eyebrow">Active Client</span>
            <span class="scb-name" id="bannerClientName">${currentClientName}</span>
          </div>
        </div>
        <button class="scb-change-btn" id="skillChangeClient">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Change Client
        </button>
      `;
      document.getElementById('skillChangeClient')?.addEventListener('click', showClientPicker);
    } else {
      banner.innerHTML = `
        <div class="scb-left">
          <div class="scb-info">
            <span class="scb-eyebrow">Skill Scoring Sheet</span>
            <span class="scb-empty-text">No client selected — select one to begin scoring</span>
          </div>
        </div>
        <button class="scb-select-btn" id="skillSelectClient">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="3.5" stroke="currentColor" stroke-width="1.6"/>
            <path d="M2 15c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          Select Client
        </button>
      `;
      document.getElementById('skillSelectClient')?.addEventListener('click', showClientPicker);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLIENT PICKER MODAL
  // ─────────────────────────────────────────────────────────────
  function showClientPicker() {
    const existing = document.getElementById('skillClientModal');
    if (existing) existing.remove();

    if (!document.getElementById('_skillModalStyles')) {
      const s = document.createElement('style');
      s.id = '_skillModalStyles';
      s.textContent = `
        #skillClientModal { position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:scmFadeIn .2s ease;padding:16px; }
        @keyframes scmFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scmSlideUp { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .scm-card { background:#fff;border-radius:18px;width:440px;max-width:100%;box-shadow:0 32px 80px rgba(0,0,0,.28);overflow:hidden;animation:scmSlideUp .25s cubic-bezier(.4,0,.2,1); }
        .scm-header { padding:24px 26px 20px;border-bottom:1px solid #f0f0f0;background:linear-gradient(135deg,#fdfaf4,#faf5e8); }
        .scm-eyebrow { font-family:'Nevis',sans-serif;font-size:9.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#C9A84C;display:block;margin-bottom:8px; }
        .scm-title { font-size:20px;font-weight:800;color:#1a1a1a;font-family:var(--ff-display);line-height:1.1;margin-bottom:4px; }
        .scm-sub { font-size:12.5px;color:#aaa;font-family:var(--ff-body); }
        .scm-body { padding:22px 26px 24px; }
        .scm-search-wrap { position:relative;margin-bottom:6px; }
        .scm-search-icon { position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#ccc;pointer-events:none;display:flex;align-items:center; }
        .scm-input { width:100%;padding:11px 14px 11px 38px;border:1.5px solid #e8e8e8;border-radius:10px;font-family:var(--ff-body);font-size:13.5px;outline:none;box-sizing:border-box;color:#1a1a1a;transition:border-color .18s,box-shadow .18s;background:#fafafa; }
        .scm-input:focus { border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.12);background:#fff; }
        .scm-list { max-height:200px;overflow-y:auto;border:1.5px solid #f0f0f0;border-radius:10px;margin-top:8px;display:none; }
        .scm-list::-webkit-scrollbar { width:4px; }
        .scm-list::-webkit-scrollbar-thumb { background:#e0e0e0;border-radius:4px; }
        .scm-list-item { display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid #f7f7f7;transition:background .12s; }
        .scm-list-item:last-child { border-bottom:none; }
        .scm-list-item:hover { background:#faf8f2; }
        .scm-list-item.selected { background:rgba(201,168,76,.08); }
        .scm-item-dot { width:7px;height:7px;border-radius:50%;background:#C9A84C;flex-shrink:0; }
        .scm-item-name { font-family:var(--ff-body);font-size:13px;font-weight:600;color:#1a1a1a;flex:1; }
        .scm-item-nick { font-family:var(--ff-body);font-size:11.5px;color:#aaa; }
        .scm-empty { padding:18px 14px;text-align:center;font-family:var(--ff-body);font-size:12.5px;color:#bbb;font-style:italic; }
        .scm-footer { display:flex;gap:10px;justify-content:flex-end;padding-top:18px;border-top:1px solid #f5f5f5;margin-top:18px; }
        .scm-btn-cancel { padding:9px 20px;border:1.5px solid #e0e0e0;border-radius:9px;background:#fff;font-family:var(--ff-body);font-size:13px;color:#888;cursor:pointer;transition:border-color .18s,color .18s; }
        .scm-btn-cancel:hover { border-color:#ccc;color:#555; }
        .scm-btn-confirm { padding:9px 22px;border:none;border-radius:9px;background:#1a1a1a;font-family:var(--ff-body);font-size:13px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:.02em;transition:background .18s,transform .12s,box-shadow .18s;box-shadow:0 3px 10px rgba(0,0,0,.18); }
        .scm-btn-confirm:hover { background:#333;transform:translateY(-1px);box-shadow:0 5px 16px rgba(0,0,0,.22); }
      `;
      document.head.appendChild(s);
    }

    const overlay = document.createElement('div');
    overlay.id = 'skillClientModal';
    overlay.innerHTML = `
      <div class="scm-card">
        <div class="scm-header">
          <span class="scm-eyebrow">Skill Scoring Sheet</span>
          <div class="scm-title">Select Client</div>
          <div class="scm-sub">Search existing clients or enter a new name to begin.</div>
        </div>
        <div class="scm-body">
          <div class="scm-search-wrap">
            <span class="scm-search-icon">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#ccc" stroke-width="1.6"/>
                <path d="M11 11l3 3" stroke="#ccc" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </span>
            <input id="scmInput" class="scm-input" type="text" placeholder="Type client name…" autocomplete="off" />
          </div>
          <div class="scm-list" id="scmList"></div>
          <div class="scm-footer">
            <button class="scm-btn-cancel" id="scmCancel">Cancel</button>
            <button class="scm-btn-confirm" id="scmConfirm">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input    = document.getElementById('scmInput');
    const listEl   = document.getElementById('scmList');
    let selectedId   = null;
    let selectedName = '';
    let allClients   = [];

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    fetch('../php/api_clients.php', { credentials: 'include' })
      .then(r => r.json())
      .then(result => { allClients = result.clients || []; renderList(''); })
      .catch(() => {});

    function renderList(term) {
      const filtered = term
        ? allClients.filter(c => c.full_name.toLowerCase().includes(term.toLowerCase()))
        : allClients;

      if (filtered.length === 0) {
        listEl.innerHTML = term
          ? `<div class="scm-empty">No clients match "${term}"</div>`
          : `<div class="scm-empty">No clients yet — type a name to create one</div>`;
        listEl.style.display = 'block';
        return;
      }

      listEl.innerHTML = filtered.map(c => `
        <div class="scm-list-item ${selectedId === c.id ? 'selected' : ''}" data-id="${c.id}" data-name="${c.full_name}">
          <span class="scm-item-dot"></span>
          <span class="scm-item-name">${c.full_name}</span>
          ${c.nickname ? `<span class="scm-item-nick">(${c.nickname})</span>` : ''}
        </div>
      `).join('');

      listEl.querySelectorAll('.scm-list-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          selectedId   = parseInt(item.dataset.id, 10);
          selectedName = item.dataset.name;
          _suppressInput = true;
          input.value = selectedName;
          _suppressInput = false;
          listEl.querySelectorAll('.scm-list-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });
      });
      listEl.style.display = 'block';
    }

    let _suppressInput = false;

    input.addEventListener('input', () => {
      if (_suppressInput) return;
      selectedId   = null;
      selectedName = '';
      renderList(input.value);
    });
    input.addEventListener('focus', () => renderList(input.value));
    setTimeout(() => input.focus(), 60);

    document.getElementById('scmCancel').addEventListener('click', () => overlay.remove());

    document.getElementById('scmConfirm').addEventListener('click', async () => {
      const name = (selectedName || input.value).trim();
      if (!name) {
        input.style.borderColor = '#ef4444';
        input.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.15)';
        return;
      }

      if (selectedId) {
        currentClientId       = selectedId;
        currentClientName     = name;
        window.ATRP_CLIENT_ID = selectedId;
      } else {
        try {
          const res    = await fetch('../php/api_clients.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: name })
          });
          const result = await res.json();
          if (result.success && result.id) {
            currentClientId       = result.id;
            currentClientName     = name;
            window.ATRP_CLIENT_ID = result.id;
          } else {
            showSkillNotification('Could not create client: ' + (result.error || ''), 'error');
            return;
          }
        } catch (e) {
          showSkillNotification('Connection error', 'error');
          return;
        }
      }

      overlay.remove();
      // CHANGE 1: Only update the banner with the client name — no data is loaded into the table
      updateClientBanner();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DATABASE — LOAD
  // ─────────────────────────────────────────────────────────────
  async function loadFromDatabase() {
    if (!currentClientId) return;

    try {
      const res    = await fetch('../php/api_skills.php?client_id=' + currentClientId, { credentials: 'include' });
      const result = await res.json();

      if (result.success && result.rows && result.rows.length > 0) {
        DRILLS = result.rows.map(r => ({
          skill:    r.skill    || '',
          attempts: parseInt(r.attempts) || 0,
          tier:     r.tier     || null,
          succ:     r.successful !== null ? String(r.successful) : '',
          unit:     r.unit     || 'attempts',
          score:    r.score    !== undefined && r.score !== null ? String(r.score) : ''
        }));
        render();
        showSkillNotification('Records loaded for "' + currentClientName + '"', 'success');
      } else {
        DRILLS = [
          { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' },
          { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' },
        ];
        render();
        showSkillNotification('No past records found for "' + currentClientName + '"', 'info');
      }

    } catch (e) {
      console.error('Skill load error:', e);
      showSkillNotification('Failed to load records — check connection', 'error');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DATABASE — SAVE
  // ─────────────────────────────────────────────────────────────
  async function saveToDatabase(submitted = false) {
    if (isSaving) return;

    if (!currentClientId) {
      showSkillNotification('Please select a client first', 'error');
      showClientPicker();
      return;
    }

    isSaving = true;
    const btn = document.getElementById('btnSave');
    if (btn) {
      btn.style.opacity = '.65';
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="20">
            <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg> ${submitted ? 'Submitting…' : 'Saving…'}`;
    }

    try {
      const payload = {
        client_id:     currentClientId,
        submitted,
        session_label: currentClientName,
        rows: DRILLS.map(d => ({
          tier:     d.tier,
          skill:    d.skill,
          attempts: d.attempts,
          succ:     d.succ,
          unit:     d.unit,
          score:    d.score
        }))
      };

      const res    = await fetch('../php/api_skills.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        if (submitted) {
          showSkillNotification(`"${currentClientName}" submitted successfully! Ready for next client.`, 'success');
          setTimeout(resetForNextClient, 1200);
        } else {
          showSkillNotification(`Draft saved for "${currentClientName}"`, 'success');
        }
      } else {
        showSkillNotification('Error: ' + (result.error || 'Unknown error'), 'error');
      }

    } catch (e) {
      console.error('Skill save error:', e);
      showSkillNotification('Failed to connect to database', 'error');
    } finally {
      isSaving = false;
      if (btn) {
        btn.style.opacity = '';
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 7.5l-4 4-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg> Save &amp; Submit`;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────
  function resetForNextClient() {
    currentClientId   = null;
    currentClientName = '';
    window.ATRP_CLIENT_ID = null;

    ['clientName','clientNickname','clientAge','clientDiagnosis',
     'clientRecorder','reportStartDate','reportEndDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    DRILLS = [
      { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' },
      { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' },
    ];

    render();
    updateClientBanner();
    showClientPicker();
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATION TOAST
  // ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

    /* Readonly styling for Attempts and Score cells */
    .attempts-input[readonly],
    .attempts-unit[readonly],
    .score-pct-input[readonly] {
      background: #f5f5f5;
      color: #888;
      cursor: default;
      pointer-events: none;
      border-color: transparent;
      box-shadow: none;
    }
  `;
  document.head.appendChild(style);

  window.showSelectDomainModal = function() {
    const existing = document.getElementById('selectDomainModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'selectDomainModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn .2s ease;padding:16px;';

    const btnChooseDomain = document.getElementById('btnChooseDomain');
    const isSkillScoringPage = !!btnChooseDomain;

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:360px;max-width:100%;box-shadow:0 24px 60px rgba(0,0,0,.25);overflow:hidden;animation:slideUp .25s cubic-bezier(.4,0,.2,1);">
        <div style="padding:28px 24px 22px;text-align:center;">
          <div style="width:56px;height:56px;margin:0 auto 16px;background:rgba(201,168,76,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#C9A84C" stroke-width="2"/>
              <path d="M12 8v4M12 15v.5" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div style="font-family:var(--ff-display, sans-serif);font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:6px;">Select Skill Domain</div>
          <div style="font-family:var(--ff-body, sans-serif);font-size:13px;color:#888;line-height:1.4;">Please select a skill domain first before scoring.</div>
        </div>
        <div style="padding:0 20px 20px;display:flex;gap:10px;justify-content:center;">
          <button id="sdmGoToSelector" style="flex:1;padding:11px 20px;border:none;border-radius:10px;background:#C9A84C;font-family:var(--ff-body, sans-serif);font-size:13px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:.02em;transition:background .18s,transform .12s;box-shadow:0 3px 10px rgba(201,168,76,.3);">Go to Selector</button>
          <button id="sdmCloseModal" style="flex:1;padding:11px 20px;border:1.5px solid #e0e0e0;border-radius:10px;background:#fff;font-family:var(--ff-body, sans-serif);font-size:13px;font-weight:600;color:#666;cursor:pointer;transition:border-color .18s,color .18s;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('sdmCloseModal').addEventListener('click', () => overlay.remove());
    document.getElementById('sdmGoToSelector').addEventListener('click', () => {
      overlay.remove();
      if (isSkillScoringPage) {
        btnChooseDomain.click();
      } else {
        window.location.href = 'skill-scoring.html';
      }
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  };

  // ─────────────────────────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  function showSkillNotification(message, type) {
    const existing = document.querySelector('.skill-toast');
    if (existing) existing.remove();

    const bgMap = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
    const toast = document.createElement('div');
    toast.className = 'skill-toast';
    toast.style.cssText = `
      position:fixed;top:80px;right:20px;
      padding:12px 20px;border-radius:8px;
      font-family:var(--ff-body);font-size:13px;font-weight:500;
      z-index:9999;background:${bgMap[type] || bgMap.info};
      color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);
      max-width:340px;animation:slideIn .3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  if (!document.getElementById('skillToastStyles')) {
    const s = document.createElement('style');
    s.id = 'skillToastStyles';
    s.textContent = `
      @keyframes slideIn  { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes slideOut { from{transform:translateX(0);opacity:1} to{transform:translateX(110%);opacity:0} }
      @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    `;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────
  // TABLE HELPERS
  // ─────────────────────────────────────────────────────────────
  function tierByKey(k) { return TIERS.find(t => t.key === k) || null; }

  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? parseInt(r[1],16)+','+parseInt(r[2],16)+','+parseInt(r[3],16) : '180,180,180';
  }

  function recalcPct(idx) {
    const max    = parseInt(DRILLS[idx].attempts) || 0;
    const succEl = document.getElementById('succ-'+idx);
    const v      = succEl ? parseFloat(succEl.value) : NaN;
    const p      = (!isNaN(v) && max > 0) ? Math.min(100, Math.round((v / max) * 100)) : null;

    const scoreInput = document.getElementById('score-'+idx);
    if (scoreInput) {
      scoreInput.value       = p !== null ? p : '';
      scoreInput.placeholder = p !== null ? '' : '—';
      DRILLS[idx].score      = p !== null ? String(p) : '';
    }
    renderSummary();
  }

  function closeAll() {
    document.querySelectorAll('.cs-panel.open').forEach(p => {
      p.classList.remove('open');
      const trigger = document.getElementById(p.id.replace('cs-panel','cs-trigger'));
      if (trigger) trigger.classList.remove('open');
    });
  }

  function applyTierToRow(idx, tierKey) {
    const tier  = tierByKey(tierKey);
    const color = tier ? tier.color : null;
    const rgb   = color ? hexToRgb(color) : '180,180,180';
    const input = document.getElementById('skill-input-'+idx);
    if (input) {
      input.style.color      = color || '#bbb';
      input.style.background = color ? 'rgba('+rgb+',0.13)' : 'rgba(180,180,180,0.10)';
    }
    const swatch = document.getElementById('cs-swatch-'+idx);
    if (swatch) swatch.style.background = color || '#ddd';
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY RENDERER
  // ─────────────────────────────────────────────────────────────
  function renderSummary() {
    const grid   = document.getElementById('summaryGrid');
    const metaEl = document.getElementById('summaryMeta');
    const titleEl = document.getElementById('summaryTitle');
    if (titleEl) titleEl.textContent = 'N/A';

    if (!grid) return;

    const activeTiers = getActiveTiers();
    const agg = {};
    activeTiers.forEach(t => { agg[t.key] = { count:0, totalAttempts:0, totalSucc:0, drills:[] }; });

    let totalSelected = 0;
    DRILLS.forEach(d => {
      if (!d.tier) return;
      const a   = agg[d.tier];
      const att = parseInt(d.attempts) || 0;
      const suc = parseFloat(d.succ);
      a.count++;
      a.totalAttempts += att;
      if (!isNaN(suc)) a.totalSucc += suc;
      a.drills.push(d.skill || null);
      totalSelected++;
    });

    metaEl.innerHTML = totalSelected === 0
      ? '<strong>0</strong> of ' + DRILLS.length + ' rows assigned'
      : '<strong>' + totalSelected + '</strong> of ' + DRILLS.length + ' rows assigned';

    grid.innerHTML = '';
    activeTiers.forEach(t => {
      const a       = agg[t.key];
      const pct     = a.totalAttempts > 0
        ? Math.min(100, Math.round((a.totalSucc / a.totalAttempts) * 100))
        : null;
      const inactive = a.count === 0;

      const card = document.createElement('div');
      card.className = 'tier-card ' + t.cls + (inactive ? ' inactive' : '');

      const badgeHTML =
        '<div class="tc-top">' +
          '<span class="tc-badge" style="background:'+t.color+'">' +
            '<span class="tc-badge-dot"></span>N/A' +
          '</span>' +
          '<span class="tc-count-pill">' +
            (a.count === 0 ? 'None' : a.count + (a.count === 1 ? ' skill' : ' skills')) +
          '</span>' +
        '</div>';

      const statHTML = (inactive || pct === null)
        ? '<div class="tc-stat"><span class="tc-pct-empty">—</span></div>' +
          '<span class="tc-fraction" style="color:#ccc">No data yet</span>'
        : '<div class="tc-stat"><span class="tc-pct">' + pct + '</span>' +
          '<span class="tc-pct-symbol">%</span></div>' +
          '<span class="tc-fraction">' + a.totalSucc + ' / ' + a.totalAttempts + ' attempts</span>';

      const barHTML =
        '<div class="tc-bar-track">' +
          '<div class="tc-bar-fill" style="width:' + (pct||0) + '%"></div>' +
        '</div>';

      let tagsHTML = '<div class="tc-drills">';
      if (a.drills.length === 0) {
        tagsHTML += '<span class="tc-drill-tag unnamed">No drills assigned</span>';
      } else {
        a.drills.forEach(name => {
          tagsHTML += name
            ? '<span class="tc-drill-tag">' + name + '</span>'
            : '<span class="tc-drill-tag unnamed">Unnamed drill</span>';
        });
      }
      tagsHTML += '</div>';

      card.innerHTML = badgeHTML + statHTML + barHTML + tagsHTML;
      grid.appendChild(card);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ROW BUILDER
  // ─────────────────────────────────────────────────────────────
  function buildRow(drill, idx) {
    const tier    = tierByKey(drill.tier);
    const color   = tier ? tier.color : null;
    const rgb     = color ? hexToRgb(color) : '180,180,180';
    const skillBg = color ? 'rgba('+rgb+',0.13)' : 'rgba(180,180,180,0.10)';
    const skillTx = color || '#bbb';

    const max  = parseInt(drill.attempts) || 0;
    const v    = parseFloat(drill.succ);
    const autoPct = (!isNaN(v) && max > 0) ? Math.min(100, Math.round((v/max)*100)) : null;
    const scoreVal = drill.score !== '' && drill.score !== undefined ? drill.score : (autoPct !== null ? autoPct : '');

    const tr = document.createElement('tr');
    tr.dataset.idx = idx;

    // Subskill Level — custom dropdown matching Drills style
    const selectedSub = drill.tier || '';
    const activeTiersNow = getActiveTiers();
    const subOptions = activeTiersNow.length > 0 && activeTiersNow[0].key !== 'eye'
      ? activeTiersNow
      : [];
    const subLabel = selectedSub
      ? (activeTiersNow.find(t => t.key === selectedSub) || {}).label || selectedSub
      : '';

    const tdSub = document.createElement('td');
    tdSub.className = 'c-sub';
    tdSub.innerHTML =
      '<div class="custom-select-wrap subskill-dropdown-wrap">' +
        '<div class="cs-trigger sub-trigger" id="sub-trigger-' + idx + '" data-idx="' + idx + '">' +
          '<span class="cs-label' + (subLabel ? '' : ' placeholder') + '" id="sub-label-' + idx + '">' + (subLabel || 'Select domain first') + '</span>' +
          '<svg class="cs-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>' +
        '<div class="cs-panel sub-panel" id="sub-panel-' + idx + '">' +
          (subOptions.length > 0
            ? subOptions.map(t =>
                '<div class="cs-option' + (selectedSub === t.key ? ' selected' : '') + '" data-idx="' + idx + '" data-tier="' + t.key + '">' +
                  '<span class="cs-opt-bar" style="background:' + t.color + '"></span>' +
                  '<span class="cs-opt-label">' + t.label + '</span>' +
                  '<svg class="cs-opt-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</div>'
              ).join('')
            : '<div class="cs-option cs-option-disabled" data-idx="' + idx + '" data-tier="">' +
                '<span class="cs-opt-label" style="color:#aaa;font-style:italic">Select domain first</span>' +
              '</div>'
          ) +
        '</div>' +
      '</div>';
    tr.appendChild(tdSub);

    // 2. Drill dropdown
    const tierLabel    = tier ? tier.label : null;
    const drillOptions = tierLabel && DRILL_OPTIONS[tierLabel] ? DRILL_OPTIONS[tierLabel] : [];
    const selectedDrill = drill.skill || '';
    const tdSkill = document.createElement('td');
    tdSkill.className = 'c-skl';
    tdSkill.innerHTML =
      '<div class="custom-select-wrap skill-dropdown-wrap">'+
        '<div class="cs-trigger drill-trigger" id="drill-trigger-'+idx+'" data-idx="'+idx+'">'+
          '<span class="cs-label'+(selectedDrill?'':' placeholder')+'" id="drill-label-'+idx+'">'+(selectedDrill || 'Select drill…')+'</span>'+
          '<svg class="cs-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
        '</div>'+
        '<div class="cs-panel drill-panel" id="drill-panel-'+idx+'">'+
          (drillOptions.length > 0
            ? drillOptions.map(d =>
                '<div class="cs-option'+(selectedDrill === d ?' selected':'')+'" data-idx="'+idx+'" data-drill="'+d+'">'+
                  '<span class="cs-opt-bar" style="background:'+(tier ? tier.color : '#ddd')+'"></span>'+
                  '<span class="cs-opt-label">'+d+'</span>'+
                  '<svg class="cs-opt-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
                '</div>'
              ).join('')
            : '<div class="cs-option" data-idx="'+idx+'" data-drill="">'+
                '<span class="cs-opt-label" style="color:#aaa;font-style:italic">Select subskill first</span>'+
              '</div>'
          )+
        '</div>'+
      '</div>';
    tr.appendChild(tdSkill);

    // 3. Attempts — readonly, value set programmatically
    const tdCrit = document.createElement('td');
    tdCrit.className = 'c-crit';
    tdCrit.innerHTML =
      '<div class="crit-wrap">'+
        '<div class="attempts-field">'+
          '<input type="number" class="attempts-input" id="attempts-'+idx+'" data-idx="'+idx+'"'+
            ' min="0" value="'+(drill.attempts||0)+'" placeholder="0" readonly tabindex="-1" />'+
          '<input type="text" class="attempts-unit" id="unit-'+idx+'" data-idx="'+idx+'" value="'+(drill.unit||'attempts')+'" autocomplete="off" readonly tabindex="-1" />'+
        '</div>'+
      '</div>';
    tr.appendChild(tdCrit);

    // 4. Successful
    const tdSucc = document.createElement('td');
    tdSucc.className = 'c-succ';
    tdSucc.innerHTML =
      '<div class="score-wrap">'+
        '<input type="number" class="score-input" id="succ-'+idx+'" data-idx="'+idx+'"'+
          ' placeholder="0" min="0" value="'+(drill.succ||'')+'" />'+
      '</div>';
    tr.appendChild(tdSucc);

    // 5. Score — readonly, auto-calculated from successful/attempts
    const tdScore = document.createElement('td');
    tdScore.className = 'c-sc';
    tdScore.innerHTML =
      '<div class="score-wrap">'+
        '<input type="number" class="score-pct-input" id="score-'+idx+'" data-idx="'+idx+'"'+
          ' placeholder="—" min="0" max="100" style="text-align:center;width:70px;" value="'+(scoreVal)+'" readonly tabindex="-1" />'+
        '<span style="font-size:12px;color:#888;margin-left:2px;">%</span>'+
      '</div>';
    tr.appendChild(tdScore);

    return tr;
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  function render() {
    const body = document.getElementById('tableBody');
    body.innerHTML = '';
    DRILLS.forEach((d, i) => body.appendChild(buildRow(d, i)));

    // Subskill (tier) dropdown triggers
    document.querySelectorAll('.sub-trigger').forEach(trigger => {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const panel = document.getElementById('sub-panel-'+idx);
        if (!panel) return;
        // Don't open if only placeholder option present
        const hasRealOptions = panel.querySelector('.cs-option:not(.cs-option-disabled)');
        if (!hasRealOptions) {
          window.showSelectDomainModal && window.showSelectDomainModal();
          return;
        }
        const isOpen = panel.classList.contains('open');
        closeAll();
        if (!isOpen) {
          panel.classList.add('open');
          this.classList.add('open');
        }
      });
    });

    // Subskill option clicks
    document.querySelectorAll('.sub-panel .cs-option:not(.cs-option-disabled)').forEach(opt => {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx     = +this.dataset.idx;
        const tierKey = this.dataset.tier;
        DRILLS[idx].tier = tierKey;
        const tier    = getActiveTiers().find(t => t.key === tierKey);
        const label   = tier ? tier.label : tierKey;
        document.getElementById('sub-label-'+idx).textContent = label;
        document.getElementById('sub-label-'+idx).classList.remove('placeholder');
        document.querySelectorAll('#sub-panel-'+idx+' .cs-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('sub-panel-'+idx).classList.remove('open');
        document.getElementById('sub-trigger-'+idx).classList.remove('open');
        renderSummary();
      });
    });

    // Drill dropdown triggers
    document.querySelectorAll('.drill-trigger').forEach(trigger => {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const panel = document.getElementById('drill-panel-'+idx);
        const isOpen = panel.classList.contains('open');
        closeAll();
        if (!isOpen) {
          panel.classList.add('open');
          this.classList.add('open');
        }
      });
    });

    // Drill option clicks
    document.querySelectorAll('.drill-panel .cs-option').forEach(opt => {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const drill = this.dataset.drill;
        DRILLS[idx].skill = drill;
        document.getElementById('drill-label-'+idx).textContent = drill || 'Select drill…';
        document.getElementById('drill-label-'+idx).classList.toggle('placeholder', !drill);
        document.querySelectorAll('#drill-panel-'+idx+' .cs-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('drill-panel-'+idx).classList.remove('open');
        document.getElementById('drill-trigger-'+idx).classList.remove('open');
        renderSummary();
      });
    });

    // Attempts input
    document.querySelectorAll('.attempts-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.dataset.idx;
        let v = parseInt(this.value);
        if (isNaN(v) || v < 1) v = 1;
        DRILLS[idx].attempts = v;
        const succEl = document.getElementById('succ-'+idx);
        if (succEl) {
          let s = parseFloat(succEl.value);
          if (!isNaN(s) && s > v) { succEl.value = v; DRILLS[idx].succ = v; }
          succEl.max = v;
        }
        const scoreInput = document.getElementById('score-'+idx);
        if (scoreInput) delete scoreInput.dataset.manualOverride;
        recalcPct(idx);
      });
      input.addEventListener('blur', function() {
        const idx = +this.dataset.idx;
        if (!this.value || parseInt(this.value) < 0) {
          this.value = 0;
          DRILLS[idx].attempts = 0;
          recalcPct(idx);
        }
      });
    });

    // Unit text
    document.querySelectorAll('.attempts-unit').forEach(input => {
      input.addEventListener('input', function() {
        DRILLS[+this.dataset.idx].unit = this.value;
      });
    });

    // Successful input
    document.querySelectorAll('.score-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.dataset.idx;
        let v     = parseFloat(this.value);
        const max = parseInt(DRILLS[idx].attempts) || 1;
        if (!isNaN(v) && v < 0)   { this.value = 0;   v = 0; }
        if (!isNaN(v) && v > max) { this.value = max; v = max; }
        DRILLS[idx].succ = this.value;
        const scoreInput = document.getElementById('score-'+idx);
        if (scoreInput) delete scoreInput.dataset.manualOverride;
        recalcPct(idx);
      });
    });

    // Score is readonly — auto-calculated by recalcPct(), no input listener needed

    const delBtn = document.getElementById('btnDelRow');
    if (delBtn) delBtn.disabled = DRILLS.length <= 1;

    renderSummary();
  }

  // ─────────────────────────────────────────────────────────────
  // BUTTON WIRING
  // ─────────────────────────────────────────────────────────────
  document.getElementById('btnAddRow').addEventListener('click', () => {
    DRILLS.push({ skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts', score: '' });
    render();
    const scroll = document.querySelector('.table-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });

  document.getElementById('btnDelRow').addEventListener('click', () => {
    if (DRILLS.length <= 1) return;
    DRILLS.pop();
    render();
  });

  document.getElementById('btnSave').addEventListener('click', () => {
    saveToDatabase(true);
  });

  document.addEventListener('click', closeAll);

  // ─────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────
  render();
  updateClientBanner();
  pollForClient();

})();