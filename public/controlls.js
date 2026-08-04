
    (function() {
        const bar = document.getElementById('controlsBar');
        const toggleBtn = document.getElementById('toggleBarBtn');
        const toggleIcon = document.getElementById('toggleIcon');

        // state: true = bar visible, false = hidden
        let isVisible = true;

        function updateBar(state) {
            if (state) {
                // show bar
                bar.classList.remove('hidden-bar');
                // use "V" (chevron-down) to indicate "visible / click to hide"
                toggleIcon.className = 'fas fa-chevron-down';
                toggleBtn.setAttribute('title', 'Hide controls bar');
            } else {
                // hide bar
                bar.classList.add('hidden-bar');
                // use "/\" (chevron-up) to indicate "hidden / click to show"
                toggleIcon.className = 'fas fa-chevron-up';
                toggleBtn.setAttribute('title', 'Show controls bar');
            }
            isVisible = state;
        }

        // click toggle: invert state
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            updateBar(!isVisible);
        });

        // initial state: visible → show "V" (chevron-down)
        // but we want the initial icon to be "V" (chevron-down) to match "visible"
        // and when hidden it becomes "/\" (chevron-up)
        // However the default in HTML is fa-chevron-left — we override on load.
        // Set initial state explicitly.
        updateBar(true); // ensures icon is "V" and bar visible
    })();
