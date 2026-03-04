    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar   = document.getElementById('sidebar');
    const mainEl    = document.getElementById('mainContent');
    const topLeft   = document.getElementById('topbarLeft');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (sidebar) sidebar.classList.toggle('slim');
        if (mainEl) mainEl.classList.toggle('slim');
        if (topLeft) topLeft.classList.toggle('slim');
      });
    }

    // nav item active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });