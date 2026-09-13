document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Menu Toggle ---
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMobile = document.querySelector('.nav-mobile');

    if (mobileMenuToggle && navMobile) {
        const setMenu = (open) => {
            mobileMenuToggle.setAttribute('aria-expanded', String(open));
            mobileMenuToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
            navMobile.classList.toggle('active', open);
        };

        mobileMenuToggle.addEventListener('click', () => {
            setMenu(mobileMenuToggle.getAttribute('aria-expanded') !== 'true');
        });

        navMobile.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMobile.classList.contains('active')) {
                setMenu(false);
                mobileMenuToggle.focus();
            }
        });
    }

    // --- Intersection Observer for Scroll Animations ---
    const faders = document.querySelectorAll('.fade-in');
    
    const appearOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, appearOptions);

    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });

});
