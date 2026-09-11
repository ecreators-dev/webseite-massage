document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Menu Toggle ---
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMobile = document.querySelector('.nav-mobile');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    if (mobileMenuToggle && navMobile) {
        mobileMenuToggle.addEventListener('click', () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            navMobile.classList.toggle('active');
            
            // Toggle hamburger animation
            const bars = mobileMenuToggle.querySelectorAll('.bar');
            if (!isExpanded) {
                bars[0].style.transform = 'translateY(8px) rotate(45deg)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'translateY(-8px) rotate(-45deg)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });

        // Close mobile menu on link click
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMobile.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const bars = mobileMenuToggle.querySelectorAll('.bar');
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            });
        });
    }

    // --- Smooth Scrolling for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Adjust scroll position for fixed header
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

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

    // --- Booking assistant (termin-buchen.html only) ---
    const bookingGrid = document.querySelector('.booking-grid');
    if (bookingGrid) {
        initBookingAssistant();
    }
});

function initBookingAssistant() {
    const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const MONTH_LABELS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    // Example time slots for demo purposes only — no real availability backend.
    const DEMO_TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

    const state = {
        service: { name: '', minutes: '', price: '' },
        viewYear: new Date().getFullYear(),
        viewMonth: new Date().getMonth(),
        selectedDate: null, // Date object
        selectedTime: null
    };

    const stepEls = document.querySelectorAll('#booking-steps .step');
    const calTitle = document.getElementById('cal-title');
    const calDays = document.getElementById('cal-days');
    const slotsWrap = document.getElementById('time-slots-wrap');
    const slotsEl = document.getElementById('time-slots');
    const summaryService = document.getElementById('summary-service');
    const summaryDuration = document.getElementById('summary-duration');
    const summaryPrice = document.getElementById('summary-price');
    const summaryDate = document.getElementById('summary-date');
    const summaryTime = document.getElementById('summary-time');

    function setActiveStep(n) {
        stepEls.forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.step, 10) <= n);
        });
    }

    function readSelectedService() {
        const checked = document.querySelector('input[name="service"]:checked');
        if (!checked) return;
        state.service.name = checked.value;
        const firstChip = checked.closest('.service-option').querySelector('.duration-chip');
        if (firstChip) {
            state.service.minutes = firstChip.dataset.min;
            state.service.price = firstChip.dataset.price;
        }
        updateSummary();
    }

    function updateSummary() {
        summaryService.textContent = state.service.name || '—';
        summaryDuration.textContent = state.service.minutes ? state.service.minutes + ' Minuten' : '';
        summaryPrice.textContent = state.service.price ? state.service.price + ' €' : '';

        if (state.selectedDate) {
            summaryDate.textContent = state.selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
            setActiveStep(2);
        } else {
            summaryDate.textContent = 'Bitte wählen Sie ein Datum';
        }

        if (state.selectedTime) {
            summaryTime.textContent = state.selectedTime + ' Uhr';
            setActiveStep(3);
        } else {
            summaryTime.textContent = 'Bitte wählen Sie eine Uhrzeit';
        }
    }

    // --- Service selection (step 1) ---
    document.querySelectorAll('input[name="service"]').forEach(input => {
        input.addEventListener('change', readSelectedService);
    });
    document.querySelectorAll('.service-option').forEach(option => {
        option.querySelectorAll('.duration-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const input = option.querySelector('input[name="service"]');
                input.checked = true;
                state.service.name = input.value;
                state.service.minutes = chip.dataset.min;
                state.service.price = chip.dataset.price;
                updateSummary();
            });
        });
    });
    readSelectedService();

    // --- Calendar (step 2) ---
    function renderCalendar() {
        calTitle.textContent = MONTH_LABELS[state.viewMonth] + ' ' + state.viewYear;
        calDays.innerHTML = '';

        const firstOfMonth = new Date(state.viewYear, state.viewMonth, 1);
        // Convert JS getDay() (0=Sun) to Monday-first index (0=Mon)
        const startOffset = (firstOfMonth.getDay() + 6) % 7;
        const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < startOffset; i++) {
            const empty = document.createElement('span');
            empty.className = 'calendar-day empty';
            calDays.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(state.viewYear, state.viewMonth, day);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'calendar-day';
            btn.textContent = day;

            const isPast = date < today;
            // Demo availability: Sundays are shown as fully booked.
            const isSunday = date.getDay() === 0;
            if (isPast || isSunday) {
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    state.selectedDate = date;
                    state.selectedTime = null;
                    renderCalendar();
                    renderTimeSlots();
                    updateSummary();
                });
            }

            if (date.getTime() === today.getTime()) btn.classList.add('today');
            if (state.selectedDate && date.getTime() === state.selectedDate.getTime()) btn.classList.add('selected');

            calDays.appendChild(btn);
        }
    }

    function renderTimeSlots() {
        if (!state.selectedDate) {
            slotsWrap.hidden = true;
            return;
        }
        slotsWrap.hidden = false;
        slotsEl.innerHTML = '';

        const label = document.getElementById('time-slots-label');
        label.textContent = 'Verfügbare Termine am ' +
            state.selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

        DEMO_TIME_SLOTS.forEach(time => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot';
            btn.textContent = time;
            if (time === state.selectedTime) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                state.selectedTime = time;
                renderTimeSlots();
                updateSummary();
            });
            slotsEl.appendChild(btn);
        });
    }

    document.getElementById('cal-prev').addEventListener('click', () => {
        state.viewMonth -= 1;
        if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear -= 1; }
        renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        state.viewMonth += 1;
        if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear += 1; }
        renderCalendar();
    });

    renderCalendar();
    updateSummary();

    // --- Step 3: form submit (client-side only, no real sending) ---
    const form = document.getElementById('booking-form');
    const confirmationPanel = document.getElementById('confirmation-panel');
    const confirmationSummary = document.getElementById('confirmation-summary');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!state.selectedDate || !state.selectedTime) {
            alert('Bitte wählen Sie zuerst ein Datum und eine Uhrzeit aus.');
            return;
        }
        if (!form.reportValidity()) return;

        const name = form.elements['name'].value.trim();
        const dateLabel = state.selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        confirmationSummary.textContent =
            name + ', Ihre Anfrage für "' + state.service.name + '" am ' + dateLabel + ' um ' + state.selectedTime + ' Uhr ist eingegangen.';

        form.hidden = true;
        confirmationPanel.hidden = false;
        confirmationPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}
