(function () {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  const current = window.location.pathname.split('/').pop() || 'index.html';
  if (header) {
    header.innerHTML = `
      <header class="site-header">
        <a class="brand" href="/index.html" aria-label="SafeWork home">
          <span class="brand-symbol">S</span>
          <span><strong>SafeWork</strong><small>Safer people. Stronger workplaces.</small></span>
        </a>
        <nav class="site-nav" aria-label="Primary navigation">
          <a href="/index.html" data-page="index.html">Home</a>
          <a href="/about.html" data-page="about.html">About</a>
          <a href="/features.html" data-page="features.html">Features</a>
          <a href="/how-it-works.html" data-page="how-it-works.html">How It Works</a>
          <a href="/contact.html" data-page="contact.html">Contact</a>
        </nav>
        <div class="header-actions">
          <button class="theme-toggle" type="button" aria-label="Toggle colour theme" data-theme-toggle>☼ ◐</button>
          <a class="btn btn-gradient" href="/login.html">Sign in <span>→</span></a>
        </div>
        <button class="mobile-menu" type="button" aria-label="Open menu" aria-expanded="false" data-menu-toggle>☰</button>
      </header>`;
  }
  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div><strong>SafeWork</strong><p>Practical safety learning for safer workplace teams.</p></div>
          <div class="footer-links"><a href="/about.html">About</a><a href="/features.html">Features</a><a href="/how-it-works.html">How It Works</a><a href="/contact.html">Contact</a><a href="/login.html">Sign in</a></div>
        </div>
        <div class="footer-bottom">© 2026 SafeWork · Northgate Workplace Safety</div>
      </footer>`;
  }
  document.querySelectorAll('[data-page]').forEach(a => {
    if (a.dataset.page === current || (current === '' && a.dataset.page === 'index.html')) a.classList.add('active');
  });
  const toggle = document.querySelector('[data-theme-toggle]');
  if (localStorage.getItem('safework-theme') === 'light') document.body.classList.add('light-theme');
  toggle?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('safework-theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
  });
  const menu = document.querySelector('[data-menu-toggle]');
  menu?.addEventListener('click', () => {
    const nav = document.querySelector('.site-nav');
    const open = nav?.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(Boolean(open)));
  });
})();
