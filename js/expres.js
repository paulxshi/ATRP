(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // EXPRESSIVE COMMUNICATION — subskills & drills
  // ─────────────────────────────────────────────────────────────
  const TIERS = [
    { key: 'simple', label: 'Simple Communication',       color: '#1447e6', cls: 't-simple' },
    { key: 'info',   label: 'Personal Information',       color: '#00c950', cls: 't-info'   },
    { key: 'desc',   label: 'Descriptive Communication',  color: '#facc15', cls: 't-desc'   },
    { key: 'comp',   label: 'Comprehensive Communication',color: '#86198f', cls: 't-comp'   },
  ];

  const DRILL_OPTIONS = {
    'Simple Communication':        ['Naming Objects', 'Nod or Headshakes'],
    'Personal Information':        ['Name', 'Age', 'Birthday', 'Address'],
    'Descriptive Communication':   ['Label Objects', 'Describe Actions', 'Use Adjectives', 'Describe Colors'],
    'Comprehensive Communication': ['Complete Sentence', 'Basic Comprehension'],
  };

  // Expose globals so skill-scoring.html domain modal can read them
  window.ATRP_SUB_DOMAINS = window.ATRP_SUB_DOMAINS || {
    'Communication': ['Receptive', 'Expressive'],
    'Daily Living':  ['Personal', 'Domestic', 'Community'],
    'Socialization': ['Interpersonal Relationship', 'Play and Leisure', 'Coping Skills']
  };

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────
  let DRILLS = [
    { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' },
    { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' },
  ];

  let currentClientId   = null;
  let currentClientName = '';
  let isSaving          = false;

  // ─────────────────────────────────────────────────────────────
  // CLIENT RESOLUTION
  // ─────────────────────────────────────────────────────────────
  function resolveClient() {
    const id = window.ATRP_CLIENT_ID || null;
    if (id) {
      currentClientId   = id;
      const nameEl      = document.getElementById('clientName');
      currentClientName = nameEl ? (nameEl.value || 'Client #' + id) : 'Client #' + id;
    }
    updateClientBanner();
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
          display:flex;align-items:center;justify-content:space-between;
          padding:14px 22px;
          background:linear-gradient(135deg,#fdfaf4 0%,#faf7ed 100%);
          border-bottom:1.5px solid rgba(201,168,76,.18);
          font-family:var(--ff-body);gap:12px;
        }
        .scb-left{display:flex;align-items:center;gap:12px;}
        .scb-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#e8ca7a);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(201,168,76,.35);}
        .scb-avatar svg{width:18px;height:18px;}
        .scb-info{display:flex;flex-direction:column;gap:1px;}
        .scb-eyebrow{font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#C9A84C;}
        .scb-name{font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.2;}
        .scb-empty-text{font-size:13px;font-weight:500;color:#aaa;}
        .scb-change-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:transparent;border:1.5px solid rgba(201,168,76,.4);border-radius:8px;font-family:var(--ff-body);font-size:12px;font-weight:600;color:#7a5c1e;cursor:pointer;transition:background .18s,border-color .18s,transform .12s,box-shadow .18s;white-space:nowrap;flex-shrink:0;}
        .scb-change-btn:hover{background:rgba(201,168,76,.10);border-color:#C9A84C;box-shadow:0 2px 8px rgba(201,168,76,.2);transform:translateY(-1px);}
        .scb-select-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 20px;background:#1a1a1a;border:none;border-radius:9px;font-family:var(--ff-body);font-size:12.5px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:.02em;transition:background .18s,transform .12s,box-shadow .18s;white-space:nowrap;flex-shrink:0;box-shadow:0 3px 12px rgba(0,0,0,.18);}
        .scb-select-btn:hover{background:#333;transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.22);}
        .scb-select-btn svg{width:14px;height:14px;flex-shrink:0;}
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
        </button>`;
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
        </button>`;
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
        #skillClientModal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:scmFadeIn .2s ease;padding:16px;}
        @keyframes scmFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scmSlideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .scm-card{background:#fff;border-radius:18px;width:440px;max-width:100%;box-shadow:0 32px 80px rgba(0,0,0,.28);overflow:hidden;animation:scmSlideUp .25s cubic-bezier(.4,0,.2,1);}
        .scm-header{padding:24px 26px 20px;border-bottom:1px solid #f0f0f0;background:linear-gradient(135deg,#fdfaf4,#faf5e8);}
        .scm-eyebrow{font-family:'Nevis',sans-serif;font-size:9.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#C9A84C;display:block;margin-bottom:8px;}
        .scm-title{font-size:20px;font-weight:800;color:#1a1a1a;font-family:var(--ff-display);line-height:1.1;margin-bottom:4px;}
        .scm-sub{font-size:12.5px;color:#aaa;font-family:var(--ff-body);}
        .scm-body{padding:22px 26px 24px;}
        .scm-search-wrap{position:relative;margin-bottom:6px;}
        .scm-search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#ccc;pointer-events:none;display:flex;align-items:center;}
        .scm-input{width:100%;padding:11px 14px 11px 38px;border:1.5px solid #e8e8e8;border-radius:10px;font-family:var(--ff-body);font-size:13.5px;outline:none;box-sizing:border-box;color:#1a1a1a;transition:border-color .18s,box-shadow .18s;background:#fafafa;}
        .scm-input:focus{border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.12);background:#fff;}
        .scm-list{max-height:200px;overflow-y:auto;border:1.5px solid #f0f0f0;border-radius:10px;margin-top:8px;display:none;}
        .scm-list::-webkit-scrollbar{width:4px;}
        .scm-list::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:4px;}
        .scm-list-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid #f7f7f7;transition:background .12s;}
        .scm-list-item:last-child{border-bottom:none;}
        .scm-list-item:hover{background:#faf8f2;}
        .scm-list-item.selected{background:rgba(201,168,76,.08);}
        .scm-item-dot{width:7px;height:7px;border-radius:50%;background:#C9A84C;flex-shrink:0;}
        .scm-item-name{font-family:var(--ff-body);font-size:13px;font-weight:600;color:#1a1a1a;flex:1;}
        .scm-item-nick{font-family:var(--ff-body);font-size:11.5px;color:#aaa;}
        .scm-empty{padding:18px 14px;text-align:center;font-family:var(--ff-body);font-size:12.5px;color:#bbb;font-style:italic;}
        .scm-footer{display:flex;gap:10px;justify-content:flex-end;padding-top:18px;border-top:1px solid #f5f5f5;margin-top:18px;}
        .scm-btn-cancel{padding:9px 20px;border:1.5px solid #e0e0e0;border-radius:9px;background:#fff;font-family:var(--ff-body);font-size:13px;color:#888;cursor:pointer;transition:border-color .18s,color .18s;}
        .scm-btn-cancel:hover{border-color:#ccc;color:#555;}
        .scm-btn-confirm{padding:9px 22px;border:none;border-radius:9px;background:#1a1a1a;font-family:var(--ff-body);font-size:13px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:.02em;transition:background .18s,transform .12s,box-shadow .18s;box-shadow:0 3px 10px rgba(0,0,0,.18);}
        .scm-btn-confirm:hover{background:#333;transform:translateY(-1px);box-shadow:0 5px 16px rgba(0,0,0,.22);}
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
            <input id="scmInput" class="scm-input" type="text" placeholder="Type client name…" autocomplete="off"/>
          </div>
          <div class="scm-list" id="scmList"></div>
          <div class="scm-footer">
            <button class="scm-btn-cancel" id="scmCancel">Cancel</button>
            <button class="scm-btn-confirm" id="scmConfirm">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input  = document.getElementById('scmInput');
    const listEl = document.getElementById('scmList');
    let selectedId = null, selectedName = '', allClients = [];

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    fetch('../php/api_clients.php')
      .then(r => r.json())
      .then(res => { allClients = res.clients || []; renderList(''); })
      .catch(() => {});

    function renderList(term) {
      const filtered = term
        ? allClients.filter(c => c.full_name.toLowerCase().includes(term.toLowerCase()))
        : allClients;
      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="scm-empty">${term ? `No clients match "${term}"` : 'No clients yet — type a name to create one'}</div>`;
        listEl.style.display = 'block';
        return;
      }
      listEl.innerHTML = filtered.map(c => `
        <div class="scm-list-item${selectedId === c.id ? ' selected' : ''}" data-id="${c.id}" data-name="${c.full_name}">
          <span class="scm-item-dot"></span>
          <span class="scm-item-name">${c.full_name}</span>
          ${c.nickname ? `<span class="scm-item-nick">(${c.nickname})</span>` : ''}
        </div>`).join('');
      listEl.querySelectorAll('.scm-list-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          selectedId = parseInt(item.dataset.id);
          selectedName = item.dataset.name;
          input.value = selectedName;
          listEl.querySelectorAll('.scm-list-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });
      });
      listEl.style.display = 'block';
    }

    input.addEventListener('input', () => { selectedId = null; selectedName = ''; renderList(input.value); });
    input.addEventListener('focus', () => renderList(input.value));
    setTimeout(() => input.focus(), 60);

    document.getElementById('scmCancel').addEventListener('click', () => overlay.remove());
    document.getElementById('scmConfirm').addEventListener('click', async () => {
      const name = (selectedName || input.value).trim();
      if (!name) { input.style.borderColor = '#ef4444'; input.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)'; return; }

      if (selectedId) {
        currentClientId = selectedId; currentClientName = name; window.ATRP_CLIENT_ID = selectedId;
      } else {
        try {
          const res    = await fetch('../php/api_clients.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: name }) });
          const result = await res.json();
          if (result.success && result.id) {
            currentClientId = result.id; currentClientName = name; window.ATRP_CLIENT_ID = result.id;
          } else { showToast('Could not create client: ' + (result.error || ''), 'error'); return; }
        } catch (e) { showToast('Connection error', 'error'); return; }
      }
      overlay.remove();
      updateClientBanner();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DATABASE — LOAD / SAVE
  // ─────────────────────────────────────────────────────────────
  async function loadFromDatabase() {
    if (!currentClientId) return;
    try {
      const res    = await fetch('../php/api_skills.php?client_id=' + currentClientId);
      const result = await res.json();
      if (result.success && result.rows && result.rows.length > 0) {
        DRILLS = result.rows.map(r => ({
          skill: r.skill || '', attempts: parseInt(r.attempts) || 0,
          tier: r.tier || null, succ: r.successful !== null ? String(r.successful) : '',
          unit: r.unit || 'attempts'
        }));
        render();
        showToast('Skill data loaded', 'success');
      }
    } catch (e) { console.error('Skill load error:', e); }
  }

  async function saveToDatabase(submitted = false) {
    if (isSaving) return;
    if (!currentClientId) { showToast('Please select a client first', 'error'); showClientPicker(); return; }

    isSaving = true;
    const btn = document.getElementById('btnSave');
    if (btn) { btn.style.opacity = '.65'; btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="20"><animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite"/></circle></svg> ${submitted ? 'Submitting…' : 'Saving…'}`; }

    try {
      const res    = await fetch('../php/api_skills.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: currentClientId, submitted, session_label: currentClientName, rows: DRILLS.map(d => ({ tier: d.tier, skill: d.skill, attempts: d.attempts, succ: d.succ, unit: d.unit })) })
      });
      const result = await res.json();
      if (result.success) {
        if (submitted) { showToast(`"${currentClientName}" submitted successfully!`, 'success'); setTimeout(resetForNextClient, 1200); }
        else showToast(`Draft saved for "${currentClientName}"`, 'success');
      } else { showToast('Error: ' + (result.error || 'Unknown error'), 'error'); }
    } catch (e) { showToast('Failed to connect to database', 'error'); }
    finally {
      isSaving = false;
      if (btn) { btn.style.opacity = ''; btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 7.5l-4 4-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Save &amp; Submit`; }
    }
  }

  function resetForNextClient() {
    currentClientId = null; currentClientName = ''; window.ATRP_CLIENT_ID = null;
    DRILLS = [
      { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' },
      { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' },
    ];
    render(); updateClientBanner(); showClientPicker();
  }

  // ─────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────
  function showToast(message, type) {
    document.querySelector('.skill-toast')?.remove();
    const bgMap = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
    const t = document.createElement('div');
    t.className = 'skill-toast';
    t.style.cssText = `position:fixed;top:80px;right:20px;padding:12px 20px;border-radius:8px;font-family:var(--ff-body);font-size:13px;font-weight:500;z-index:9999;background:${bgMap[type]||bgMap.info};color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:340px;animation:slideIn .3s ease;`;
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => { t.style.animation = 'slideOut .3s ease'; setTimeout(() => t.remove(), 300); }, 3500);
  }

  if (!document.getElementById('skillToastStyles')) {
    const s = document.createElement('style');
    s.id = 'skillToastStyles';
    s.textContent = `@keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(110%);opacity:0}}`;
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
    const max = parseInt(DRILLS[idx].attempts) || 0;
    const v   = parseFloat(document.getElementById('succ-'+idx)?.value);
    const p   = (!isNaN(v) && max > 0) ? Math.min(100, Math.round((v/max)*100)) : null;
    const el  = document.getElementById('pct-'+idx);
    if (el) el.textContent = p !== null ? p + '%' : '—';
    renderSummary();
  }

  function closeAll() {
    document.querySelectorAll('.cs-panel.open').forEach(p => {
      p.classList.remove('open');
      const tr = document.getElementById(p.id.replace('cs-panel','cs-trigger'));
      if (tr) tr.classList.remove('open');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // REBUILD DRILL PANEL after subskill changes
  // ─────────────────────────────────────────────────────────────
  function rebuildDrillPanel(idx, tierKey) {
    const tier         = tierByKey(tierKey);
    const drillOptions = tier && DRILL_OPTIONS[tier.label] ? DRILL_OPTIONS[tier.label] : [];
    const tierColor    = tier ? tier.color : '#ddd';

    DRILLS[idx].skill = '';
    const drillLabel = document.getElementById('drill-label-'+idx);
    if (drillLabel) { drillLabel.textContent = 'Select drill…'; drillLabel.classList.add('placeholder'); }

    const panel = document.getElementById('drill-panel-'+idx);
    if (!panel) return;

    panel.innerHTML = drillOptions.length > 0
      ? drillOptions.map(d =>
          '<div class="cs-option" data-idx="'+idx+'" data-drill="'+d+'">'+
            '<span class="cs-opt-bar" style="background:'+tierColor+'"></span>'+
            '<span class="cs-opt-label">'+d+'</span>'+
            '<svg class="cs-opt-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
          '</div>'
        ).join('')
      : '<div class="cs-option cs-option-disabled" data-idx="'+idx+'" data-drill=""><span class="cs-opt-label" style="color:#aaa;font-style:italic">No drills available</span></div>';

    panel.querySelectorAll('.cs-option:not(.cs-option-disabled)').forEach(opt => {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const i = +this.dataset.idx;
        const drill = this.dataset.drill;
        DRILLS[i].skill = drill;
        document.getElementById('drill-label-'+i).textContent = drill;
        document.getElementById('drill-label-'+i).classList.remove('placeholder');
        panel.querySelectorAll('.cs-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        panel.classList.remove('open');
        document.getElementById('drill-trigger-'+i).classList.remove('open');
        renderSummary();
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  function renderSummary() {
    const grid   = document.getElementById('summaryGrid');
    const metaEl = document.getElementById('summaryMeta');
    if (!grid) return;

    const agg = {};
    TIERS.forEach(t => { agg[t.key] = { count:0, totalAttempts:0, totalSucc:0, drills:[] }; });

    let totalSelected = 0;
    DRILLS.forEach(d => {
      if (!d.tier || !agg[d.tier]) return;
      const a = agg[d.tier];
      a.count++;
      a.totalAttempts += parseInt(d.attempts) || 0;
      const suc = parseFloat(d.succ);
      if (!isNaN(suc)) a.totalSucc += suc;
      a.drills.push(d.skill || null);
      totalSelected++;
    });

    metaEl.innerHTML = `<strong>${totalSelected}</strong> of ${DRILLS.length} rows assigned`;
    grid.innerHTML = '';

    TIERS.forEach(t => {
      const a        = agg[t.key];
      const pct      = a.totalAttempts > 0 ? Math.min(100, Math.round((a.totalSucc/a.totalAttempts)*100)) : null;
      const inactive = a.count === 0;

      const card = document.createElement('div');
      card.className = 'tier-card ' + t.cls + (inactive ? ' inactive' : '');
      card.innerHTML =
        '<div class="tc-top">'+
          '<span class="tc-badge" style="background:'+t.color+'"><span class="tc-badge-dot"></span>'+t.label+'</span>'+
          '<span class="tc-count-pill">'+(a.count === 0 ? 'None' : a.count+(a.count===1?' skill':' skills'))+'</span>'+
        '</div>'+
        (inactive || pct === null
          ? '<div class="tc-stat"><span class="tc-pct-empty">—</span></div><span class="tc-fraction" style="color:#ccc">No data yet</span>'
          : '<div class="tc-stat"><span class="tc-pct">'+pct+'</span><span class="tc-pct-symbol">%</span></div><span class="tc-fraction">'+a.totalSucc+' / '+a.totalAttempts+' attempts</span>'
        )+
        '<div class="tc-bar-track"><div class="tc-bar-fill" style="width:'+(pct||0)+'%;background:'+t.color+'"></div></div>'+
        '<div class="tc-drills">'+
          (a.drills.length === 0
            ? '<span class="tc-drill-tag unnamed">No drills assigned</span>'
            : a.drills.map(n => n ? '<span class="tc-drill-tag">'+n+'</span>' : '<span class="tc-drill-tag unnamed">Unnamed drill</span>').join('')
          )+
        '</div>';
      grid.appendChild(card);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ROW BUILDER
  // ─────────────────────────────────────────────────────────────
  function buildRow(drill, idx) {
    const tier  = tierByKey(drill.tier);
    const color = tier ? tier.color : null;

    const tr = document.createElement('tr');
    tr.dataset.idx = idx;

    // 1. Subskill Level
    const tdSub = document.createElement('td');
    tdSub.className = 'c-sub';
    tdSub.innerHTML =
      '<div class="custom-select-wrap">'+
        '<div class="cs-trigger" id="cs-trigger-'+idx+'" data-idx="'+idx+'">'+
          '<span class="cs-swatch" id="cs-swatch-'+idx+'" style="background:'+(color||'#ddd')+'"></span>'+
          '<span class="cs-label'+(tier?'':' placeholder')+'" id="cs-label-'+idx+'">'+(tier?tier.label:'Select subskill…')+'</span>'+
          '<svg class="cs-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
        '</div>'+
        '<div class="cs-panel" id="cs-panel-'+idx+'">'+
          TIERS.map(t =>
            '<div class="cs-option'+(drill.tier===t.key?' selected':'')+'" data-idx="'+idx+'" data-key="'+t.key+'" data-color="'+t.color+'">'+
              '<span class="cs-opt-bar" style="background:'+t.color+'"></span>'+
              '<span class="cs-opt-label">'+t.label+'</span>'+
              '<svg class="cs-opt-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
            '</div>'
          ).join('')+
        '</div>'+
      '</div>';
    tr.appendChild(tdSub);

    // 2. Drills
    const drillOptions  = tier && DRILL_OPTIONS[tier.label] ? DRILL_OPTIONS[tier.label] : [];
    const selectedDrill = drill.skill || '';
    const tdSkill = document.createElement('td');
    tdSkill.className = 'c-skl';
    tdSkill.innerHTML =
      '<div class="custom-select-wrap skill-dropdown-wrap">'+
        '<div class="cs-trigger drill-trigger" id="drill-trigger-'+idx+'" data-idx="'+idx+'">'+
          '<span class="cs-label'+(selectedDrill?'':' placeholder')+'" id="drill-label-'+idx+'">'+(selectedDrill||'Select drill…')+'</span>'+
          '<svg class="cs-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
        '</div>'+
        '<div class="cs-panel drill-panel" id="drill-panel-'+idx+'">'+
          (drillOptions.length > 0
            ? drillOptions.map(d =>
                '<div class="cs-option'+(selectedDrill===d?' selected':'')+'" data-idx="'+idx+'" data-drill="'+d+'">'+
                  '<span class="cs-opt-bar" style="background:'+(color||'#ddd')+'"></span>'+
                  '<span class="cs-opt-label">'+d+'</span>'+
                  '<svg class="cs-opt-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
                '</div>'
              ).join('')
            : '<div class="cs-option cs-option-disabled" data-idx="'+idx+'" data-drill=""><span class="cs-opt-label" style="color:#aaa;font-style:italic">Select subskill first</span></div>'
          )+
        '</div>'+
      '</div>';
    tr.appendChild(tdSkill);

    // 3. Attempts — readonly
    const tdCrit = document.createElement('td');
    tdCrit.className = 'c-crit';
    tdCrit.innerHTML =
      '<div class="crit-wrap"><div class="attempts-field">'+
        '<input type="number" class="attempts-input" id="attempts-'+idx+'" data-idx="'+idx+'" min="0" value="'+(drill.attempts||0)+'" placeholder="0" readonly tabindex="-1"/>'+
        '<input type="text" class="attempts-unit" id="unit-'+idx+'" data-idx="'+idx+'" value="'+(drill.unit||'attempts')+'" autocomplete="off" readonly tabindex="-1"/>'+
      '</div></div>';
    tr.appendChild(tdCrit);

    // 4. Successful
    const tdSucc = document.createElement('td');
    tdSucc.className = 'c-succ';
    tdSucc.innerHTML =
      '<div class="score-wrap">'+
        '<input type="number" class="score-input" id="succ-'+idx+'" data-idx="'+idx+'" placeholder="0" min="0" value="'+(drill.succ||'')+'"/>'+
      '</div>';
    tr.appendChild(tdSucc);

    // 5. Score — readonly, auto-calculated
    const max = parseInt(drill.attempts) || 0;
    const sv  = parseFloat(drill.succ);
    const p   = (!isNaN(sv) && max > 0) ? Math.min(100, Math.round((sv/max)*100)) : null;
    const tdScore = document.createElement('td');
    tdScore.className = 'c-sc';
    tdScore.innerHTML = '<div class="score-wrap"><span class="score-pct" id="pct-'+idx+'">'+(p!==null?p+'%':'—')+'</span></div>';
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

    // Subskill triggers
    document.querySelectorAll('.cs-trigger:not(.drill-trigger)').forEach(trigger => {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const panel = document.getElementById('cs-panel-'+idx);
        const isOpen = panel.classList.contains('open');
        closeAll();
        if (!isOpen) { panel.classList.add('open'); this.classList.add('open'); }
      });
    });

    // Subskill option clicks
    document.querySelectorAll('.cs-panel:not(.drill-panel) .cs-option').forEach(opt => {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const key   = this.dataset.key;
        const color = this.dataset.color;
        DRILLS[idx].tier = key;
        document.getElementById('cs-swatch-'+idx).style.background = color;
        const lbl = document.getElementById('cs-label-'+idx);
        lbl.textContent = tierByKey(key).label;
        lbl.classList.remove('placeholder');
        document.querySelectorAll('#cs-panel-'+idx+' .cs-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('cs-panel-'+idx).classList.remove('open');
        document.getElementById('cs-trigger-'+idx).classList.remove('open');
        rebuildDrillPanel(idx, key);
        renderSummary();
      });
    });

    // Drill triggers
    document.querySelectorAll('.drill-trigger').forEach(trigger => {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const panel = document.getElementById('drill-panel-'+idx);
        const isOpen = panel.classList.contains('open');
        closeAll();
        if (!isOpen) { panel.classList.add('open'); this.classList.add('open'); }
      });
    });

    // Drill option clicks (initial render)
    document.querySelectorAll('.drill-panel .cs-option:not(.cs-option-disabled)').forEach(opt => {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const drill = this.dataset.drill;
        DRILLS[idx].skill = drill;
        document.getElementById('drill-label-'+idx).textContent = drill;
        document.getElementById('drill-label-'+idx).classList.remove('placeholder');
        document.querySelectorAll('#drill-panel-'+idx+' .cs-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('drill-panel-'+idx).classList.remove('open');
        document.getElementById('drill-trigger-'+idx).classList.remove('open');
        renderSummary();
      });
    });

    // Successful input
    document.querySelectorAll('.score-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.dataset.idx;
        let v = parseFloat(this.value);
        const max = parseInt(DRILLS[idx].attempts) || 1;
        if (!isNaN(v) && v < 0)   { this.value = 0;   v = 0; }
        if (!isNaN(v) && v > max) { this.value = max; v = max; }
        DRILLS[idx].succ = this.value;
        recalcPct(idx);
      });
    });

    const delBtn = document.getElementById('btnDelRow');
    if (delBtn) delBtn.disabled = DRILLS.length <= 1;
    renderSummary();
  }

  // ─────────────────────────────────────────────────────────────
  // BUTTON WIRING
  // ─────────────────────────────────────────────────────────────
  document.getElementById('btnAddRow').addEventListener('click', () => {
    DRILLS.push({ skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' });
    render();
    const scroll = document.querySelector('.table-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });
  document.getElementById('btnDelRow').addEventListener('click', () => { if (DRILLS.length > 1) { DRILLS.pop(); render(); } });
  document.getElementById('btnSave').addEventListener('click', () => saveToDatabase(true));
  document.addEventListener('click', closeAll);

  // ─────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────
  render();
  updateClientBanner();
  pollForClient();

})();