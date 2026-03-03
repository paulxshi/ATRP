    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar   = document.getElementById('sidebar');
    const mainEl    = document.getElementById('mainContent');
    const topLeft   = document.getElementById('topbarLeft');

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('slim');
      mainEl.classList.toggle('slim');
      topLeft.classList.toggle('slim');
    });

    // nav item active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });