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

    // --- Startseite: Logo dreht zu Anna ---
    // Ablauf: 6 s warten, 0,6 s drehen (0,3 s bis 90 Grad, Szenenwechsel,
    // 0,3 s zurueck auf 0), Gruss 2,4 s tippen, 3 s stehen, zurueckdrehen,
    // wieder 6 s warten. Maus auf der Buehne: sofort zu Anna und dort
    // bleiben, bis die Maus geht. Tab unsichtbar: Ablauf pausiert.
    const stage = document.querySelector('.hero-stage');
    const flip = stage && stage.querySelector('.hero-flip');
    const slogan = stage && stage.querySelector('.stage-slogan');
    if (stage && flip && slogan) {
        const desktop = window.matchMedia('(min-width: 901px)');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const fullText = slogan.dataset.text || '';
        let run = 0;          // erhoeht sich bei jeder Unterbrechung
        let hovering = false;
        let timer = null;

        const wait = (ms) => new Promise(r => { timer = setTimeout(r, ms); });
        // Halbe Drehung; vorherige Animationen werden verworfen, damit sich
        // keine gefuellten Endzustaende stapeln.
        const half = async (from, to, easing) => {
            flip.getAnimations().forEach(a => a.cancel());
            const anim = flip.animate(
                [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
                { duration: 300, easing, fill: 'forwards' }
            );
            try { await anim.finished; } catch (e) { /* abgebrochen */ }
        };
        const resetFlip = () => flip.getAnimations().forEach(a => a.cancel());

        const showScene = async (anna, id) => {
            if (stage.classList.contains('is-anna') === anna) return;
            if (reduced.matches) { stage.classList.toggle('is-anna', anna); return; }
            await half(0, 90, 'cubic-bezier(0.55, 0, 1, 0.45)');
            if (id !== run) return;
            stage.classList.toggle('is-anna', anna);
            if (!anna) slogan.textContent = '';
            await half(-90, 0, 'cubic-bezier(0, 0.55, 0.45, 1)');
        };

        const type = async (id) => {
            if (reduced.matches) { slogan.textContent = fullText; return; }
            slogan.textContent = '';
            slogan.classList.add('is-typing');
            const step = 2400 / Math.max(fullText.length, 1);
            for (let i = 1; i <= fullText.length; i++) {
                await wait(step);
                if (id !== run) return;
                slogan.textContent = fullText.slice(0, i);
            }
            slogan.classList.remove('is-typing');
        };

        const cycle = async () => {
            const id = ++run;
            await wait(6000);
            if (id !== run || hovering || document.hidden) return;
            await showScene(true, id);
            if (id !== run) return;
            await type(id);
            if (id !== run) return;
            await wait(3000);
            if (id !== run) return;
            await showScene(false, id);
            if (id === run) cycle();
        };

        // Unterbrechen (Tab unsichtbar, Mobilbreite): zurueck auf das Logo
        // ohne Animation, damit keine halbe Drehung stehen bleibt.
        const stop = () => {
            run++; clearTimeout(timer);
            resetFlip();
            stage.classList.remove('is-anna');
            slogan.classList.remove('is-typing');
            slogan.textContent = '';
        };

        stage.addEventListener('mouseenter', async () => {
            if (!desktop.matches) return;
            hovering = true;
            const id = ++run; clearTimeout(timer);
            const wasAnna = stage.classList.contains('is-anna');
            await showScene(true, id);
            if (id === run && (!wasAnna || slogan.textContent !== fullText)) type(id);
        });
        stage.addEventListener('mouseleave', async () => {
            if (!desktop.matches) return;
            hovering = false;
            const id = ++run; clearTimeout(timer);
            slogan.classList.remove('is-typing');
            await showScene(false, id);
            if (id === run) cycle();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else if (!hovering) { if (stage.classList.contains('is-anna')) { const id = ++run; showScene(false, id).then(() => { if (id === run) cycle(); }); } else cycle(); }
        });

        if (desktop.matches) cycle();
        desktop.addEventListener('change', (e) => { if (e.matches) cycle(); else stop(); });
    }

});
