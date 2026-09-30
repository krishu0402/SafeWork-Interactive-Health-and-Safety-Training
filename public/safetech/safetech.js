// SafeTech Solutions — Corporate Site JavaScript

(function () {
    'use strict';

    // ── Mobile Navigation ──────────────────────────────────────────────
    const menuBtn = document.getElementById('st-menu-btn');
    const nav = document.getElementById('st-nav');

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', String(isOpen));
            menuBtn.textContent = isOpen ? '✕' : '☰';
        });

        // Close on nav link click (mobile)
        nav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                nav.classList.remove('open');
                menuBtn.textContent = '☰';
            });
        });
    }

    // ── Sticky header shadow ───────────────────────────────────────────
    const header = document.getElementById('st-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.style.boxShadow = window.scrollY > 10
                ? '0 2px 20px rgba(0,0,0,.12)'
                : '0 1px 8px rgba(0,0,0,.06)';
        }, { passive: true });
    }

    // ── Tabs (used on Services page) ──────────────────────────────────
    document.querySelectorAll('.st-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            const wrapper = btn.closest('.st-tabs-wrapper');

            wrapper.querySelectorAll('.st-tab-btn').forEach(b => b.classList.remove('active'));
            wrapper.querySelectorAll('.st-tab-panel').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const panel = wrapper.querySelector(`#tab-${target}`);
            if (panel) panel.classList.add('active');
        });
    });

    // ── Contact form (SafeTech contact page) ──────────────────────────
    const contactForm = document.getElementById('st-contact-form');
    const formStatus = document.getElementById('st-form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending…';

            const data = {
                name: contactForm.querySelector('#st-name')?.value,
                email: contactForm.querySelector('#st-email')?.value,
                organisation: contactForm.querySelector('#st-org')?.value,
                subject: contactForm.querySelector('#st-subject')?.value || 'SafeTech Enquiry',
                message: contactForm.querySelector('#st-message')?.value
            };

            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    showStatus('success', '✓ Thank you for your message. We will be in touch shortly.');
                    contactForm.reset();
                } else {
                    const err = await res.json().catch(() => ({}));
                    showStatus('error', err.error || 'Something went wrong. Please try again.');
                }
            } catch {
                showStatus('success', '✓ Thank you for your message. We will be in touch shortly.');
                contactForm.reset();
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    function showStatus(type, message) {
        if (!formStatus) return;
        formStatus.className = `st-form-status ${type}`;
        formStatus.textContent = message;
        formStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── Animate on scroll (simple fade-in) ────────────────────────────
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.st-value-card, .st-module-card, .st-info-card, .st-step, .st-portfolio-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity .45s ease, transform .45s ease';
        observer.observe(el);
    });

})();
