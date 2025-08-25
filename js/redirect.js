// Fallback redirect script for GitHub Pages
// This ensures the app works even if index.html doesn't redirect properly

(function() {
  // Check if we're on the root page and redirect to login
  if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) {
    setTimeout(() => {
      window.location.href = './login.html';
    }, 100);
  }
})();
