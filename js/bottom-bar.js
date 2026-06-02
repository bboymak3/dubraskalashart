/**
 * Bottom Action Bar - Scroll reveal animation
 * Hides button labels by default, reveals them on scroll up or touch
 */
(function() {
  let lastScrollY = window.scrollY;
  let scrollTimeout = null;
  const bottomBar = document.querySelector('.bottom-action-bar');

  if (!bottomBar) return;

  function expandBar() {
    bottomBar.classList.add('bar-expanded');
  }
  function collapseBar() {
    bottomBar.classList.remove('bar-expanded');
  }

  window.addEventListener('scroll', function() {
    const currentScrollY = window.scrollY;
    if (currentScrollY < lastScrollY) {
      // Scrolling up → show labels
      expandBar();
    } else if (currentScrollY > lastScrollY + 10) {
      // Scrolling down → hide labels
      collapseBar();
    }
    lastScrollY = currentScrollY;

    // Auto-collapse after 3s of no scrolling
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(collapseBar, 3000);
  }, { passive: true });

  // Also expand on touch/click on the bar
  bottomBar.addEventListener('touchstart', expandBar, { passive: true });
  bottomBar.addEventListener('click', function() {
    expandBar();
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(collapseBar, 3000);
  });

  // Start with bar expanded briefly so user knows labels exist
  expandBar();
  setTimeout(collapseBar, 2500);
})();
