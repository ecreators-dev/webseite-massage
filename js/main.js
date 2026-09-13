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

    // --- Startseite: Massagen-Ticker ---
    // Desktop: Karte in der Mitte wird hervorgehoben, wartet 2 s, dann
    // gleitet die Reihe eine Karte nach links. Endlos durch Klone vor und
    // hinter den Originalen; nach dem Gleiten wird unsichtbar auf die
    // mittlere Kopie zurueckgesetzt. Klick: anhalten + Beschreibung,
    // erneuter Klick im Ticker: weiter. Mobil nur Wischen + Klick.
    const ticker = document.querySelector('.hero-ticker');
    const track = ticker && ticker.querySelector('.ticker-track');
    const viewport = ticker && ticker.querySelector('.ticker-viewport');
    const desc = ticker && ticker.querySelector('.ticker-desc');
    if (ticker && track && viewport && desc) {
        const desktopQ = window.matchMedia('(min-width: 901px) and (min-height: 651px)');
        const reducedQ = window.matchMedia('(prefers-reduced-motion: reduce)');
        const originals = [...track.children];
        const n = originals.length;
        const clone = (li) => {
            const c = li.cloneNode(true);
            c.setAttribute('aria-hidden', 'true');
            c.querySelector('.ticker-hit').tabIndex = -1;
            return c;
        };
        originals.forEach(li => track.appendChild(clone(li)));
        originals.slice().reverse().forEach(li => track.insertBefore(clone(li), track.firstChild));
        const cards = [...track.children];   // 3 Saetze: Klone, Originale, Klone

        let index = n;        // Karte, die in der Mitte steht
        let openCard = null;
        let loopTimer = null;

        const place = (animate) => {
            const card = cards[index];
            const x = viewport.clientWidth / 2 - (card.offsetLeft - cards[0].offsetLeft + card.offsetWidth / 2);
            track.style.transition = animate ? 'transform 0.8s cubic-bezier(0.45, 0, 0.25, 1)' : 'none';
            track.style.transform = `translateX(${x}px)`;
            cards.forEach((c, k) => c.classList.toggle('is-center', k === index));
        };
        // Nach dem Gleiten ohne sichtbaren Sprung auf den mittleren Satz zurueck
        const normalize = () => {
            if (index >= n && index < 2 * n) return;
            index = ((index % n) + n) % n + n;
            track.classList.add('no-anim');
            place(false);
            void track.offsetWidth;
            track.classList.remove('no-anim');
        };
        const running = () => desktopQ.matches && !reducedQ.matches && !openCard && !document.hidden;
        const schedule = () => {
            clearTimeout(loopTimer);
            if (!running()) return;
            loopTimer = setTimeout(() => {
                index++;
                place(true);
                loopTimer = setTimeout(() => { normalize(); schedule(); }, 850);
            }, 2000);
        };

        const openDesc = (card) => {
            const src = originals[cards.indexOf(card) % n];
            desc.textContent = '';
            const title = document.createElement('strong');
            title.textContent = src.dataset.title;
            const text = document.createElement('span');
            text.textContent = src.dataset.desc;
            const book = document.createElement('a');
            book.className = 'btn-book ticker-book';
            book.href = 'https://www.fresha.com/a/anna-vietnam-thai-massage-heilbronn-sichererstrasse-90-r8e9wyab';
            book.target = '_blank';
            book.rel = 'noopener';
            book.textContent = 'Buchen ';
            const arrow = document.createElement('span');
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '→';
            book.append(arrow);
            // unten rechts: Beschreibung wieder verbergen (wie Klick aufs Bild)
            const hide = document.createElement('button');
            hide.type = 'button';
            hide.className = 'ticker-hide';
            hide.textContent = 'verbergen';
            hide.addEventListener('click', closeDesc);
            const actions = document.createElement('div');
            actions.className = 'ticker-desc-actions';
            actions.append(book, hide);
            desc.append(title, text, actions);
            desc.hidden = false;
            card.querySelector('.ticker-hit').setAttribute('aria-expanded', 'true');
            openCard = card;
            clearTimeout(loopTimer);
            // Anna/Logo sollen waehrend des Lesens auf dem Logo stehen bleiben
            document.dispatchEvent(new CustomEvent('ticker:open'));
        };
        const closeDesc = () => {
            desc.hidden = true;
            if (openCard) openCard.querySelector('.ticker-hit').setAttribute('aria-expanded', 'false');
            openCard = null;
            document.dispatchEvent(new CustomEvent('ticker:close'));
            if (desktopQ.matches) { normalize(); schedule(); }
        };

        track.addEventListener('click', (e) => {
            const card = e.target.closest('.ticker-card');
            if (!card) return;
            if (openCard) { closeDesc(); return; }
            if (desktopQ.matches) {
                clearTimeout(loopTimer);
                index = cards.indexOf(card);
                place(true);
            }
            openDesc(card);
        });
        ticker.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && openCard) closeDesc();
            if (!desktopQ.matches || openCard) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                clearTimeout(loopTimer);
                index += e.key === 'ArrowRight' ? 1 : -1;
                place(true);
                loopTimer = setTimeout(() => { normalize(); schedule(); }, 850);
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) clearTimeout(loopTimer); else schedule();
        });
        let resizeFrame = 0;
        window.addEventListener('resize', () => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => { if (desktopQ.matches) place(false); });
        });
        const setup = () => {
            clearTimeout(loopTimer);
            if (desktopQ.matches) { place(false); schedule(); }
            else { track.style.transform = ''; cards.forEach(c => c.classList.remove('is-center')); }
        };
        desktopQ.addEventListener('change', setup);
        if (document.readyState === 'complete') setup(); else window.addEventListener('load', setup);
    }

    // --- Startseite: Logo dreht zu Anna ---
    // Ablauf: 6 s warten, 0,6 s drehen (0,3 s bis 90 Grad, Szenenwechsel,
    // die neue Szene dreht sich in Gegenrichtung zurueck auf 0), 1 s Pause,
    // Satz 7,2 s tippen, 3 s stehen, zurueckdrehen, wieder 6 s warten. Maus auf der Buehne: sofort zu Anna und dort
    // bleiben, bis die Maus geht. Tab unsichtbar: Ablauf pausiert.
    const stage = document.querySelector('.hero-stage');
    const flip = stage && stage.querySelector('.hero-flip');
    const slogan = stage && stage.querySelector('.stage-slogan');
    if (stage && flip && slogan) {
        const desktop = window.matchMedia('(min-width: 901px)');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        // Annas Satz wechselt stuendlich: Aus Datum und Stunde wird ein
        // fester Zufallswert, also bleibt der Satz innerhalb einer Stunde
        // gleich (auch beim Neuladen). Saetze mit Feierabend/abends kommen
        // nur ab 17 Uhr in Frage.
        const sayings = [
            { text: 'Na, ist dein Nacken fest oder sind deine Schultern verspannt? Komm zu mir.' },
            { text: 'Hast du heute wieder viel zu viel um die Ohren? Komm zu mir und gönn dir eine Pause.' },
            { text: 'Immer für alle da und selbst kaum Zeit für dich? Komm einfach zu mir.' },
            { text: 'Feierabend, aber dein Kopf kommt noch nicht zur Ruhe? Komm zu mir.', evening: true },
            { text: 'War dein Arbeitstag wieder lang? Komm vorbei, ich kümmere mich um dich.', evening: true },
            { text: 'Müde, verspannt und trotzdem noch unruhig? Komm zu mir und schalte einfach mal ab.' },
            { text: 'Sitzt du den ganzen Tag bei der Arbeit? Komm vorbei, dein Rücken wird es dir danken.' },
            { text: 'Läuft bei dir gerade alles gleichzeitig? Komm zu mir und gönn dir eine kleine Pause.' },
            { text: 'Du kümmerst dich um alle anderen? Dann bist du jetzt mal dran. Komm zu mir.' },
            { text: 'Kannst du abends nicht richtig abschalten? Komm zu mir und lass einfach mal los.', evening: true }
        ];
        const pickSaying = () => {
            const now = new Date();
            const hour = now.getHours();
            const isEvening = hour >= 17 || hour < 4;
            const pool = sayings.filter(s => isEvening || !s.evening);
            const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hour}`;
            let hash = 2166136261;
            for (const ch of key) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
            return pool[(hash >>> 0) % pool.length].text;
        };
        // Jede weitere Drehung zeigt einen anderen Satz: zufaellig aus den
        // zur Tageszeit passenden, nie zweimal hintereinander derselbe.
        let fullText = '';
        let shown = 0;
        const nextSaying = () => {
            if (shown++ === 0) return pickSaying();
            const hour = new Date().getHours();
            const isEvening = hour >= 17 || hour < 4;
            const pool = sayings.filter(s => (isEvening || !s.evening) && s.text !== fullText);
            return pool[Math.floor(Math.random() * pool.length)].text;
        };
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
            // Zu Anna: Logo dreht auf +90, Anna dreht von +90 zurueck (Gegen-
            // richtung). Zum Logo spiegelbildlich ueber -90.
            const edge = anna ? 90 : -90;
            await half(0, edge, 'cubic-bezier(0.55, 0, 1, 0.45)');
            if (id !== run) return;
            stage.classList.toggle('is-anna', anna);
            if (!anna) slogan.textContent = '';
            await half(edge, 0, 'cubic-bezier(0, 0.55, 0.45, 1)');
        };

        const type = async (id) => {
            fullText = nextSaying();   // erste Drehung: Satz der Stunde, danach wechselnd
            if (reduced.matches) { slogan.textContent = fullText; return; }
            slogan.textContent = '';
            slogan.dataset.complete = '0';
            await wait(1000);          // 1 s nach der Drehung, dann tippen
            if (id !== run) return;
            // Der ganze Satz steht von Anfang an unsichtbar in der Blase, damit
            // sie gleich ihre endgueltige Groesse hat und beim Tippen nicht waechst.
            const typed = document.createElement('span');
            typed.className = 'typed';
            const rest = document.createElement('span');
            rest.className = 'rest';
            rest.setAttribute('aria-hidden', 'true');
            rest.textContent = fullText;
            slogan.replaceChildren(typed, rest);
            slogan.classList.add('is-typing');
            const step = 7200 / Math.max(fullText.length, 1);
            for (let i = 1; i <= fullText.length; i++) {
                await wait(step);
                if (id !== run) return;
                typed.textContent = fullText.slice(0, i);
                rest.textContent = fullText.slice(i);
            }
            slogan.textContent = fullText;
            slogan.dataset.complete = '1';
            slogan.classList.remove('is-typing');
        };

        let tickerOpen = false;   // Beschreibung im Ticker offen: Logo pausiert

        const cycle = async () => {
            const id = ++run;
            if (tickerOpen) return;
            await wait(6000);
            if (id !== run || hovering || tickerOpen || document.hidden) return;
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

        // Ticker-Beschreibung offen: sofort zurueck auf das Logo und dort
        // bleiben (auch Hover dreht nicht), bis sie wieder geschlossen wird.
        document.addEventListener('ticker:open', async () => {
            tickerOpen = true;
            const id = ++run; clearTimeout(timer);
            slogan.classList.remove('is-typing');
            await showScene(false, id);
        });
        document.addEventListener('ticker:close', () => {
            tickerOpen = false;
            if (desktop.matches && !hovering) cycle();
        });

        stage.addEventListener('mouseenter', async () => {
            if (!desktop.matches || tickerOpen) return;
            hovering = true;
            const id = ++run; clearTimeout(timer);
            const wasAnna = stage.classList.contains('is-anna');
            await showScene(true, id);
            if (id === run && (!wasAnna || slogan.dataset.complete !== '1')) type(id);
        });
        stage.addEventListener('mouseleave', async () => {
            if (!desktop.matches || tickerOpen) { hovering = false; return; }
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
