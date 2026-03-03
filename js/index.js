		const toggleBtn = document.getElementById('toggleBtn');
		const sidebar = document.getElementById('sidebar');
		const main = document.getElementById('main');
		function toggleSidebar(){
			// Desktop: use .collapsed to move sidebar away; Mobile: use .open to slide in
			if (window.innerWidth <= 800){
				sidebar.classList.toggle('open');
			} else {
				sidebar.classList.toggle('collapsed');
			}
		}
		toggleBtn.addEventListener('click', toggleSidebar);
		// Close mobile sidebar when clicking outside
		document.addEventListener('click', (e)=>{
			if (window.innerWidth <= 800){
				if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)){
					sidebar.classList.remove('open');
				}
			}
		});