
(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     DEFAULT TEMPLATE  (mirrors the document images exactly)
  ───────────────────────────────────────────── */
  var DEFAULT = [
    '<p style="text-indent:2.5em">The behavior/s in the graph above were observed from <strong>(Name).</strong> This/These were measured within <strong>(Duration)</strong> from <strong>(First Recording Session)</strong> to <strong>(Last Recording Session).</strong> The following are the <strong>behaviors</strong> observed from <strong>(he/she): (Problem Behavior 1)</strong> in comparison to <strong>(Proper Behavior 1).</strong> The following are the <strong>adaptive skills</strong> that were measured from <strong>(him/her): (Skill 1).</strong></p>',

    '<p><u>Behavior Template – Type I</u></p>',

    '<p style="text-indent:2.5em"><strong>(Problem Behavior 1)</strong> is a/an <strong style="color:#e53935">(function)</strong>-based behavior. This means that the reason why <strong>(he/she)</strong> does the behavior is to <strong style="color:#e53935">(Explanation of Function)</strong>, specifically whenever <strong>(he/she) (Antecedent). (Explanation of Antecedent).</strong> The <strong>(Duration)</strong>-rate of the behavior throughout the 4 sessions is <strong>(Average Score)</strong> times. As seen in the graph above, the pattern of the behavior is <strong>(<span style="background:#86efac">rising</span> / <span style="background:#fde047">fluctuating</span> / <span style="background:#67e8f9">falling</span>)</strong> over time. <span style="background:#86efac">This indicates the need to substantially modify the response to the behavior to avoid further increase in behavior.</span> <span style="background:#fde047">This indicates the need for a more consistent response to the behavior in order to reduce it.</span> <span style="background:#67e8f9">This indicates the need to sustain the current response to the behavior with a few modifications to completely eliminate the problem behavior.</span></p>',

    '<p style="text-indent:2.5em"><strong>(Proper Behavior 1)</strong> is the Differential Reinforcement Alternative (D.R.A.) for <strong>(Problem Behavior 1).</strong> As seen in the graph above, the <strong>(Duration)</strong>-rate of the behavior throughout the 4 sessions is <strong>(Average Score)</strong> times. As seen in the graph above, the pattern of the behavior is <strong>(<span style="background:#86efac">rising</span> / <span style="background:#fde047">fluctuating</span> / <span style="background:#67e8f9">falling</span>)</strong> over time. <span style="background:#86efac">This indicates the need to proceed in fading the reinforcement to the behavior in order to avoid dependency on reinforcement.</span> <span style="background:#fde047">This indicates the need for a more consistent reinforcement to the behavior in order to add it.</span> <span style="background:#67e8f9">This indicates the need to substantially intensify the reinforcement to the behavior with a few modifications to completely replace the problem behavior.</span></p>',

    '<p style="text-indent:2.5em">Overall, <strong>(Name)</strong> is only <strong>(Proper Behavior 1)</strong> <span style="display:inline-block;vertical-align:middle;text-align:center;font-size:12px;line-height:1.3;margin:0 3px"><span style="display:block;border-bottom:1px solid #1a1a1a;padding:0 4px"><em>Proper Behavior</em></span><span style="display:block;padding:0 4px"><em>Proper Behavior + Problem Behavior</em></span></span> of the time. The goal of the intervention is to increase the percentage of <strong>(Name) (Proper Behavior 1).</strong></p>',

    '<p><u>Behavior Template – Type II</u></p>',

    '<p style="text-indent:2.5em"><strong>(Problem Behavior 1)</strong> is a/an adaptive skill that <strong>(he/she)</strong> should develop. <strong style="color:#e53935">(function)</strong>-based behavior. This means that the reason why <strong>(he/she)</strong> does the behavior is to <strong style="color:#e53935">(Explanation of Function)</strong>, specifically whenever <strong>(he/she) (Antecedent). (Explanation of Antecedent).</strong> As seen in the graph above, the estimated duration of the behavior is <span style="display:inline-block;vertical-align:middle;text-align:center;font-size:12px;line-height:1.3;margin:0 3px"><span style="display:block;border-bottom:1px solid #1a1a1a;padding:0 4px"><em>Score 1 + Score 2 + Score 3 + Score 4</em></span><span style="display:block;padding:0 4px"><em>(Interval)(Rounds)</em></span></span> minutes. This means that the duration of the behavior is [<strong><span style="background:#86efac">long (mean 50–100%)</span></strong> / <strong><span style="background:#fde047">short (mean 0–49%)</span></strong>]. <span style="background:#86efac">This indicates the need to focus the intervention on gradually reducing the duration of the behavior.</span> <span style="background:#67e8f9">This may indicate the need to shorten the duration of the intervals, or if it is already short enough, sustain the response to the behavior in order to completely extinct it.</span></p>',

    '<p><u>Skill Template – Type II</u></p>',

    '<p style="text-indent:2.5em"><strong>(Skill 1)</strong> is an adaptive skill that <strong>(he/she)</strong> should develop. <strong>(Explanation of Adaptive Skill).</strong> As seen in the graph above, <strong>(Name)\'s (Skill 1)</strong> is [<strong><span style="background:#86efac">high (mean 80%)</span></strong> / <strong><span style="background:#fde047">decent (mean 40–79%)</span></strong> / <strong><span style="background:#67e8f9">low (mean 0–39%)</span></strong>]. <span style="background:#86efac">This indicates the level of <strong>(Name)\'s (Skill 1)</strong> is adequate to <strong>(his/her)</strong> age and needs to be sustained with consistent practice.</span> <span style="background:#fde047">This indicates that the level of <strong>(Name)\'s (Skill 1)</strong> is moderately low for <strong>(his/her)</strong> age and needs the skill to be chunked into smaller and simpler pieces of information.</span> <span style="background:#67e8f9">This indicates that the level of <strong>(Name)\'s (Skill 1)</strong> is low for her age and needs the skill to be significantly chunked into smaller and simpler pieces of information.</span></p>',

    '<p style="text-indent:2.5em;color:#e53935"><strong>(Additional Comments and Remarks from the Therapist)</strong></p>',

    '<p style="text-indent:2.5em">This report represents the findings from <strong>(Name)</strong> throughout the data collection sessions. The therapy program will now proceed with the implementation of intervention plan wherein problem behaviors will be reduced while appropriate behaviors will be rewarded. After the intervention plan, the therapy program will measure the same set of behaviors again. The second set of data will be compared to the baseline set of data.</p>',

    '<p style="text-indent:2.5em">Thank you for entrusting <strong>(Name)</strong>\'s development to us. If you have concerns or inquiries regarding this progress report, undersigned below may be reached by email at psi.clientcare@gmail.com.</p>'
  ].join('\n');

  /* ─────────────────────────────────────────────
     ELEMENTS
  ───────────────────────────────────────────── */
  var ed         = document.getElementById('wuEditor');
  var wCount     = document.getElementById('wCount');
  var cCount     = document.getElementById('cCount');
  var savedPill  = document.getElementById('savedPill');
  var KEY        = 'atrp_writeup_v3';
  var saveTimer  = null;

  /* Meta & sig field IDs */
  var FIELDS = ['metaName','metaPeriod','metaAge','metaRecorder','metaGender','metaDiagnosis',
                'sigPN','sigPT','sigNN','sigNT','sigSN','sigST'];

  /* ─────────────────────────────────────────────
     LOAD
  ───────────────────────────────────────────── */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        ed.innerHTML = d.body || DEFAULT;
        FIELDS.forEach(function(id) {
          var el = document.getElementById(id);
          if (el && d[id] != null) el.value = d[id];
        });
      } else {
        ed.innerHTML = DEFAULT;
      }
    } catch(e) { ed.innerHTML = DEFAULT; }
    updateCount();
  }

  /* ─────────────────────────────────────────────
     SAVE  (debounced, fires 600 ms after last change)
  ───────────────────────────────────────────── */
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  }
  function save() {
    try {
      var d = { body: ed.innerHTML };
      FIELDS.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) d[id] = el.value;
      });
      localStorage.setItem(KEY, JSON.stringify(d));
      flashSaved();
    } catch(e) {}
  }
  function flashSaved() {
    savedPill.classList.add('show');
    clearTimeout(savedPill._t);
    savedPill._t = setTimeout(function(){ savedPill.classList.remove('show'); }, 2000);
  }

  ed.addEventListener('input', function(){ updateCount(); scheduleSave(); });
  FIELDS.forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleSave);
  });

  /* ─────────────────────────────────────────────
     TOOLBAR
  ───────────────────────────────────────────── */
  document.getElementById('wuToolbar').addEventListener('mousedown', function(e) {
    /* format command buttons */
    var btn = e.target.closest('[data-cmd]');
    if (btn) {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, null);
      updateActive();
      return;
    }
    /* highlight swatches */
    var sw = e.target.closest('[data-color]');
    if (sw) {
      e.preventDefault();
      if (sw.dataset.color === 'remove') {
        document.execCommand('removeFormat', false, null);
      } else {
        document.execCommand('hiliteColor', false, sw.dataset.color);
      }
      ed.focus();
    }
  });

  document.getElementById('tbSize').addEventListener('change', function(){
    document.execCommand('fontSize', false, this.value);
    ed.focus();
  });

  function updateActive() {
    ['bold','italic','underline'].forEach(function(cmd){
      var b = document.querySelector('[data-cmd="'+cmd+'"]');
      if (b) b.classList.toggle('active', document.queryCommandState(cmd));
    });
  }
  ed.addEventListener('keyup', updateActive);
  ed.addEventListener('mouseup', updateActive);
  document.addEventListener('selectionchange', updateActive);

  /* ─────────────────────────────────────────────
     WORD / CHAR COUNT
  ───────────────────────────────────────────── */
  function updateCount() {
    var txt   = ed.innerText || '';
    var words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
    wCount.textContent = words;
    cCount.textContent = txt.replace(/\n/g,'').length;
  }

  /* ─────────────────────────────────────────────
     COPY
  ───────────────────────────────────────────── */
  document.getElementById('btnCopy').addEventListener('click', function(){
    navigator.clipboard.writeText(ed.innerText || '').then(function(){
      toast('Plain text copied!', 'success');
    }).catch(function(){ toast('Copy failed', 'error'); });
  });

  /* ─────────────────────────────────────────────
     RESET TO DEFAULT
  ───────────────────────────────────────────── */
  document.getElementById('btnReset').addEventListener('click', function(){
    if (!confirm('Reset to the default template? Your edits will be lost.')) return;
    ed.innerHTML = DEFAULT;
    localStorage.removeItem(KEY);
    updateCount();
    toast('Reset to default template', 'info');
  });

  /* ─────────────────────────────────────────────
     PRINT
  ───────────────────────────────────────────── */
  document.getElementById('btnPrint').addEventListener('click', function(){
    save();
    window.print();
  });

  /* ─────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────── */
  function toast(msg, type) {
    var prev = document.querySelector('.wu-toast');
    if (prev) prev.remove();
    var map = { success:'#10b981', error:'#ef4444', info:'#6366f1' };
    var t = document.createElement('div');
    t.className = 'wu-toast';
    t.style.cssText = 'position:fixed;top:80px;right:20px;padding:12px 20px;border-radius:8px;'
      + 'font-family:"Work Sans",sans-serif;font-size:13px;font-weight:500;z-index:9999;'
      + 'background:' + (map[type]||map.info) + ';color:#fff;'
      + 'box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:320px;'
      + 'animation:wuSlideIn .3s ease;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.style.animation='wuSlideOut .3s ease'; setTimeout(function(){ t.remove(); },300); }, 3000);
  }

  /* ─────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────── */
  load();

})();
