
(function () {

  /* ── Tier data ── */
  const TIERS = [
    { key: 'eye',   label: 'Eye Contact',            color: '#1447e6', cls: 't-eye'   },
    { key: 'basic', label: 'Basic Understanding',    color: '#00c950', cls: 't-basic' },
    { key: 'ident', label: 'Identification',        color: '#facc15', cls: 't-ident' },
    { key: 'adv',   label: 'Advanced Understanding', color: '#86198f', cls: 't-adv'   },
  ];

  const DRILLS = [
   { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' },
   { skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' },
  ];

  /* ── Helpers ── */
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
    const pctEl  = document.getElementById('pct-'+idx);
    if (pctEl) pctEl.textContent = p !== null ? p + '%' : '\u2014';
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

    // sync skill input
    const input = document.getElementById('skill-input-'+idx);
    if (input) {
      input.style.color      = color || '#bbb';
      input.style.background = color ? 'rgba('+rgb+',0.13)' : 'rgba(180,180,180,0.10)';
    }

    // FIX: sync the swatch dot — was never updated here before
    const swatch = document.getElementById('cs-swatch-'+idx);
    if (swatch) swatch.style.background = color || '#ddd';
  }

  /* ═══════════════════════════════════════════════
     SUMMARY RENDERER
  ═══════════════════════════════════════════════ */
  function renderSummary() {
    const grid     = document.getElementById('summaryGrid');
    const metaEl   = document.getElementById('summaryMeta');
    if (!grid) return;

    /* Aggregate per tier */
    const agg = {};
    TIERS.forEach(function(t) {
      agg[t.key] = { count: 0, totalAttempts: 0, totalSucc: 0, drills: [] };
    });

    let totalSelected = 0;
    DRILLS.forEach(function(d) {
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

    /* Meta line */
    const totalRows = DRILLS.length;
    if (totalSelected === 0) {
      metaEl.innerHTML = '<strong>0</strong> of ' + totalRows + ' rows assigned';
    } else {
      metaEl.innerHTML = '<strong>' + totalSelected + '</strong> of ' + totalRows + ' rows assigned';
    }

    /* Build cards */
    grid.innerHTML = '';
    TIERS.forEach(function(t) {
      const a   = agg[t.key];
      const pct = (a.totalAttempts > 0)
        ? Math.min(100, Math.round((a.totalSucc / a.totalAttempts) * 100))
        : null;
      const inactive = a.count === 0;

      const card = document.createElement('div');
      card.className = 'tier-card ' + t.cls + (inactive ? ' inactive' : '');

      /* Badge */
      const badgeHTML =
        '<div class="tc-top">' +
          '<span class="tc-badge" style="background:' + t.color + '">' +
            '<span class="tc-badge-dot"></span>' +
            t.label +
          '</span>' +
          '<span class="tc-count-pill">' +
            (a.count === 0 ? 'None' : a.count + (a.count === 1 ? ' skill' : ' skills')) +
          '</span>' +
        '</div>';

      /* Score stat */
      let statHTML;
      if (inactive || pct === null) {
        statHTML =
          '<div class="tc-stat"><span class="tc-pct-empty">—</span></div>' +
          '<span class="tc-fraction" style="color:#ccc">No data yet</span>';
      } else {
        statHTML =
          '<div class="tc-stat">' +
            '<span class="tc-pct">' + pct + '</span>' +
            '<span class="tc-pct-symbol">%</span>' +
          '</div>' +
          '<span class="tc-fraction">' +
            a.totalSucc + ' / ' + a.totalAttempts + ' attempts' +
          '</span>';
      }

      /* Progress bar */
      const barHTML =
        '<div class="tc-bar-track">' +
          '<div class="tc-bar-fill" style="width:' + (pct !== null ? pct : 0) + '%"></div>' +
        '</div>';

      /* Drill tags */
      let tagsHTML = '<div class="tc-drills">';
      if (a.drills.length === 0) {
        tagsHTML += '<span class="tc-drill-tag unnamed">No drills assigned</span>';
      } else {
        a.drills.forEach(function(name) {
          if (name) {
            tagsHTML += '<span class="tc-drill-tag">' + name + '</span>';
          } else {
            tagsHTML += '<span class="tc-drill-tag unnamed">Unnamed drill</span>';
          }
        });
      }
      tagsHTML += '</div>';

      card.innerHTML = badgeHTML + statHTML + barHTML + tagsHTML;
      grid.appendChild(card);
    });
  }

  /* ── Build one table row ── */
  function buildRow(drill, idx) {
    const tier     = tierByKey(drill.tier);
    const color    = tier ? tier.color : null;
    const rgb      = color ? hexToRgb(color) : '180,180,180';
    const skillBg  = color ? 'rgba('+rgb+',0.13)' : 'rgba(180,180,180,0.10)';
    const skillTxt = color || '#bbb';

    const tr = document.createElement('tr');
    tr.dataset.idx = idx;  

    /* 1. Subskill dropdown */
    const tdSub = document.createElement('td');
    tdSub.className = 'c-sub';
    tdSub.innerHTML =
      '<div class="custom-select-wrap">'+
        '<div class="cs-trigger" id="cs-trigger-'+idx+'" data-idx="'+idx+'">'+
          '<span class="cs-swatch" id="cs-swatch-'+idx+'" style="background:'+(color||'#ddd')+'"></span>'+
          '<span class="cs-label'+(tier?'':' placeholder')+'" id="cs-label-'+idx+'">'+(tier?tier.label:'Choose subskill…')+'</span>'+
          '<svg class="cs-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
        '</div>'+
        '<div class="cs-panel" id="cs-panel-'+idx+'">'+
          TIERS.map(function(t){
            return '<div class="cs-option'+(drill.tier===t.key?' selected':'')+'" data-idx="'+idx+'" data-key="'+t.key+'" data-color="'+t.color+'">'+
              '<span class="cs-opt-bar" style="background:'+t.color+'"></span>'+
              '<span class="cs-opt-label">'+t.label+'</span>'+
              '<svg class="cs-opt-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
            '</div>';
          }).join('')+
        '</div>'+
      '</div>';
    tr.appendChild(tdSub);

    /* 2. Skill input */
    const tdSkill = document.createElement('td');
    tdSkill.className = 'c-skl';
    tdSkill.innerHTML =
      '<div class="skill-wrap">'+
        '<input type="text" class="skill-input" id="skill-input-'+idx+'" data-idx="'+idx+'"'+
          ' placeholder="Enter skill name…" value="'+drill.skill+'"'+
          ' autocomplete="off"'+
          ' style="color:'+skillTxt+'; background:'+skillBg+';" />'+
      '</div>';
    tr.appendChild(tdSkill);

    /* 3. Attempts */
    const tdCrit = document.createElement('td');
    tdCrit.className = 'c-crit';
    tdCrit.innerHTML =
      '<div class="crit-wrap">'+
        '<div class="attempts-field">'+
          '<input type="number" class="attempts-input" id="attempts-'+idx+'" data-idx="'+idx+'"'+
            ' min="0" value="'+(drill.attempts||0)+'" placeholder="0" />'+
          '<input type="text" class="attempts-unit" id="unit-'+idx+'" data-idx="'+idx+'" value="'+(drill.unit||'attempts')+'" autocomplete="off" />'+
        '</div>'+
      '</div>';
    tr.appendChild(tdCrit);

    /* 4. Successful */
    const tdSucc = document.createElement('td');
    tdSucc.className = 'c-succ';
    tdSucc.innerHTML =
      '<div class="score-wrap">'+
        '<input type="number" class="score-input" id="succ-'+idx+'" data-idx="'+idx+'"'+
          ' placeholder="0" min="0" value="'+(drill.succ||'')+'" />'+
      '</div>';
    tr.appendChild(tdSucc);

    /* 5. Score % */
    const tdScore = document.createElement('td');
    tdScore.className = 'c-sc';
    const max = parseInt(drill.attempts) || 0;
    const v   = parseFloat(drill.succ);
    const p   = (!isNaN(v) && max > 0) ? Math.min(100, Math.round((v/max)*100)) : null;
    tdScore.innerHTML =
      '<div class="score-wrap">'+
        '<span class="score-pct" id="pct-'+idx+'">'+(p!==null?p+'%':'—')+'</span>'+
      '</div>';
    tr.appendChild(tdScore);

    return tr;
  }

  /* ── Render table ── */
  function render() {
    const body = document.getElementById('tableBody');
    body.innerHTML = '';
    DRILLS.forEach(function(d, i) { body.appendChild(buildRow(d, i)); });

    /* Dropdown triggers */
    document.querySelectorAll('.cs-trigger').forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const panel = document.getElementById('cs-panel-'+idx);
        const isOpen = panel.classList.contains('open');
        closeAll();
        if (!isOpen) {
          panel.classList.add('open');
          this.classList.add('open');
          setTimeout(function() {
            var scroll = document.querySelector('.table-scroll');
            var panelEl = document.getElementById('cs-panel-'+idx);
            if (scroll && panelEl) {
              var scrollRect = scroll.getBoundingClientRect();
              var panelRect  = panelEl.getBoundingClientRect();
              if (panelRect.bottom > scrollRect.bottom) {
                scroll.scrollTop += (panelRect.bottom - scrollRect.bottom + 16);
              }
            }
          }, 20);
        }
      });
    });

    /* Option clicks */
    document.querySelectorAll('.cs-option').forEach(function(opt) {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx   = +this.dataset.idx;
        const key   = this.dataset.key;
        const color = this.dataset.color;

        DRILLS[idx].tier = key;

        document.getElementById('cs-swatch-'+idx).style.background = color;
        const lbl = document.getElementById('cs-label-'+idx);
        lbl.textContent = TIERS.find(function(t){ return t.key===key; }).label;
        lbl.classList.remove('placeholder');

        document.querySelectorAll('#cs-panel-'+idx+' .cs-option').forEach(function(o){ o.classList.remove('selected'); });
        this.classList.add('selected');

        applyTierToRow(idx, key);

        document.getElementById('cs-panel-'+idx).classList.remove('open');
        document.getElementById('cs-trigger-'+idx).classList.remove('open');

        renderSummary();
      });
    });

    /* Skill input */
    document.querySelectorAll('.skill-input').forEach(function(input) {
      input.addEventListener('input', function() {
        DRILLS[+this.dataset.idx].skill = this.value;
        renderSummary();
      });
    });

    /* Attempts input */
    document.querySelectorAll('.attempts-input').forEach(function(input) {
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

    /* Unit text input */
    document.querySelectorAll('.attempts-unit').forEach(function(input) {
      input.addEventListener('input', function() {
        DRILLS[+this.dataset.idx].unit = this.value;
      });
    });

    /* Successful input */
    document.querySelectorAll('.score-input').forEach(function(input) {
      input.addEventListener('input', function() {
        const idx = +this.dataset.idx;
        let v   = parseFloat(this.value);
        const max = parseInt(DRILLS[idx].attempts) || 1;
        if (!isNaN(v) && v < 0)   { this.value = 0;   v = 0; }
        if (!isNaN(v) && v > max) { this.value = max; v = max; }
        DRILLS[idx].succ = this.value;
        recalcPct(idx);
      });
    });

    const delBtn = document.getElementById('btnDelRow');
    if (delBtn) delBtn.disabled = DRILLS.length <= 1;

    const body2 = document.getElementById('tableBody');
    body2.addEventListener('click', function(e) {
      const tr = e.target.closest('tr[data-idx]');
      if (!tr) return;
      const idx = +tr.dataset.idx;
      if (DRILLS[idx] && DRILLS[idx].tier) {
        applyTierToRow(idx, DRILLS[idx].tier);
      }
    }, { once: false });
    renderSummary();
  }

  /* ── Add row ── */
  document.getElementById('btnAddRow').addEventListener('click', function() {
    DRILLS.push({ skill: '', attempts: 0, tier: null, succ: '', unit: 'attempts' });
    render();
    var scroll = document.querySelector('.table-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });

  /* ── Delete last row ── */
  document.getElementById('btnDelRow').addEventListener('click', function() {
    if (DRILLS.length <= 1) return;
    DRILLS.pop();
    render();
  });

  /* ── Save ── */
  document.getElementById('btnSave').addEventListener('click', function() {
    var self = this;
    var orig = self.innerHTML;
    self.style.opacity = '.65';
    self.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6 12 2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Saved';
    setTimeout(function(){ self.style.opacity=''; self.innerHTML=orig; }, 2000);
  });

  document.addEventListener('click', closeAll);

  render();
})();