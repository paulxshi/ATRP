/* ── Sidebar toggle ── */
const toggleBtn = document.getElementById('toggleBtn');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
    const main = document.getElementById('mainContent');
    if (main) main.classList.toggle('expanded');
  });
}

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar   = document.getElementById('sidebar');
    const mainEl    = document.getElementById('mainContent');
    const topLeft   = document.getElementById('topbarLeft');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        // Toggle sidebar collapse
        if (sidebar) sidebar.classList.toggle('slim');
        if (mainEl) mainEl.classList.toggle('slim');
        if (topLeft) topLeft.classList.toggle('slim');
        
        // Update icon between bars and times
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          if (sidebar && sidebar.classList.contains('slim')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
          } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
          }
        }
      });
    }

    // Nav item active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
});
