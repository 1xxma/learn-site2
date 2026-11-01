/* =========================================================
   auth.js — авторизация, записи, навигация в кабинет
   ========================================================= */

const AUTH_STORAGE_KEY = 'learn_users';
const SESSION_KEY = 'learn_session';
const BOOKINGS_KEY = 'learn_bookings';
const SELECTED_TUTOR_KEY = 'learn_selected_tutor';
const FAVORITES_KEY = 'learn_favorites';
const CONTACT_EMAIL = 'learn.vvf.mtuci@gmail.com';
const CONTACT_TG_CHANNEL = 'https://t.me/learn_vvf';
const CONTACT_TG_CHAT = 'https://t.me/learn_vvf_chat';
const CONTACT_TG_CHANNEL_HANDLE = '@learn_vvf';
const CONTACT_TG_CHAT_HANDLE = '@learn_vvf_chat';

const TUTORS_CATALOG = [
    { page: 'tutor.html', name: 'Смирнова Анна Сергеевна', subject: 'Математика', grades: '1-4', price: 600 },
    { page: 'tutor2.html', name: 'Козлов Дмитрий Иванович', subject: 'Математика', grades: '5-9', price: 800 },
    { page: 'tutor3.html', name: 'Морозова Елена Викторовна', subject: 'Математика', grades: '10-11', price: 800 },
    { page: 'tutor7.html', name: 'Соколова Ирина Сергеевна', subject: 'Русский язык', grades: '1-4', price: 550 },
    { page: 'tutor8.html', name: 'Лебедева Мария Сергеевна', subject: 'Русский язык', grades: '5-9', price: 600 },
    { page: 'tutor9.html', name: 'Симагина Катерина Сергеевна', subject: 'Русский язык', grades: '10-11', price: 600 },
    { page: 'tutor10.html', name: 'Фролова Анна Дмитриевна', subject: 'Английский язык', grades: '1-11', price: 800 },
    { page: 'tutor5.html', name: 'Захарова Ксения Игоревна', subject: 'Обществознание', grades: '6-9', price: 600 },
    { page: 'tutor6.html', name: 'Беляев Дмитрий Олегович', subject: 'Обществознание', grades: '10-11', price: 850 },
    { page: 'tutor14.html', name: 'Романова Екатерина Владимировна', subject: 'История', grades: '5-9', price: 900 },
    { page: 'tutor15.html', name: 'Медведев Артём Сергеевич', subject: 'История', grades: '10-11', price: 750 },
    { page: 'tutor11.html', name: 'Кузнецова Ольга Андреевна', subject: 'Биология', grades: '5-9', price: 600 },
    { page: 'tutor12.html', name: 'Павлова Виктория Сергеевна', subject: 'Биология', grades: '10-11', price: 850 },
    { page: 'tutor13.html', name: 'Соловьёв Павел Игоревич', subject: 'География', grades: '5-9', price: 600 },
    { page: 'tutor16.html', name: 'Комарова Мария Леонидовна', subject: 'Литература', grades: '5-11', price: 750 }
];

function bufToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function generateSalt() {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return bufToHex(salt);
}

async function hashPassword(password, saltHex) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
        'raw', passwordBytes, 'PBKDF2', false, ['deriveBits']
    );

    const saltBytes = new Uint8Array(
        saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16))
    );

    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
        baseKey,
        256
    );

    return bufToHex(derivedBits);
}

function getUsers() {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || {}; }
    catch { return {}; }
}

function saveUsers(users) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

async function register(name, email, password) {
    const users = getUsers();
    const emailKey = email.trim().toLowerCase();

    if (users[emailKey]) {
        return { ok: false, error: 'Пользователь с таким email уже существует' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    users[emailKey] = {
        name: name.trim(),
        email: emailKey,
        salt: salt,
        hash: hash,
        createdAt: Date.now()
    };
    saveUsers(users);
    setSession(emailKey);

    return { ok: true };
}

async function login(email, password) {
    const users = getUsers();
    const emailKey = email.trim().toLowerCase();

    const user = users[emailKey];
    if (!user) return { ok: false, error: 'Пользователь не найден' };

    const hash = await hashPassword(password, user.salt);
    if (hash !== user.hash) return { ok: false, error: 'Неверный пароль' };

    setSession(emailKey);
    return { ok: true };
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}

function setSession(emailKey) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        email: String(emailKey || '').trim().toLowerCase(),
        loginAt: Date.now()
    }));
}

function clearBrokenSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;

        const session = JSON.parse(raw);
        if (!session || !session.email) {
            clearBrokenSession();
            return null;
        }

        const users = getUsers();
        const user = users[String(session.email).toLowerCase()];
        if (!user) {
            // Аккаунт удалили из хранилища — сбрасываем «залипшую» сессию
            clearBrokenSession();
            return null;
        }

        return {
            name: user.name,
            email: user.email,
            createdAt: user.createdAt || null,
            loginAt: session.loginAt || null
        };
    } catch {
        clearBrokenSession();
        return null;
    }
}

function isLoggedIn() {
    return !!getCurrentUser();
}

/* ---------- Записи на уроки ---------- */

function getBookingsStore() {
    try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || {}; }
    catch { return {}; }
}

function saveBookingsStore(store) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(store));
}

function migrateUserBookings(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    // Старый формат: { "2026-11-02": ["10.00", "14.00"] }
    const list = [];
    Object.keys(raw).forEach(date => {
        const slots = Array.isArray(raw[date]) ? raw[date] : [];
        slots.forEach((slot, index) => {
            list.push({
                id: `${date}_${slot}_${index}`,
                date: date,
                slot: slot,
                tutorName: '',
                subject: '',
                tutorPage: 'schedule.html',
                bookedAt: Date.now()
            });
        });
    });
    return list;
}

function getUserBookings(email) {
    const store = getBookingsStore();
    const key = (email || '').toLowerCase();
    const list = migrateUserBookings(store[key]);

    // Если был старый формат — сохраняем новый
    if (store[key] && !Array.isArray(store[key])) {
        store[key] = list;
        saveBookingsStore(store);
    }

    return list.slice().sort((a, b) => {
        const da = `${a.date}T${String(a.slot).replace('.', ':')}`;
        const db = `${b.date}T${String(b.slot).replace('.', ':')}`;
        return da.localeCompare(db);
    });
}

function saveUserBooking({ date, slot, tutorName, subject, tutorPage }) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: 'Нужно войти в аккаунт' };

    const store = getBookingsStore();
    const list = migrateUserBookings(store[user.email]);

    const exists = list.some(b => b.date === date && b.slot === slot);
    if (exists) return { ok: false, error: 'Это время уже занято' };

    const booking = {
        id: `${date}_${slot}_${Date.now()}`,
        date: date,
        slot: slot,
        tutorName: tutorName || '',
        subject: subject || '',
        tutorPage: tutorPage || 'schedule.html',
        bookedAt: Date.now()
    };

    list.push(booking);
    store[user.email] = list;
    saveBookingsStore(store);

    return { ok: true, booking: booking };
}

function cancelUserBooking(bookingId) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: 'Нужно войти в аккаунт' };

    const store = getBookingsStore();
    const list = migrateUserBookings(store[user.email]);
    const next = list.filter(b => b.id !== bookingId);

    if (next.length === list.length) {
        return { ok: false, error: 'Запись не найдена' };
    }

    store[user.email] = next;
    saveBookingsStore(store);
    return { ok: true };
}

function getUserBusySlotsMap() {
    const user = getCurrentUser();
    if (!user) return {};

    const map = {};
    getUserBookings(user.email).forEach(b => {
        if (!map[b.date]) map[b.date] = [];
        if (!map[b.date].includes(b.slot)) map[b.date].push(b.slot);
    });
    return map;
}

/* ---------- Выбранный репетитор для записи ---------- */

function setSelectedTutor(info) {
    sessionStorage.setItem(SELECTED_TUTOR_KEY, JSON.stringify(info || {}));
}

function getSelectedTutor() {
    try { return JSON.parse(sessionStorage.getItem(SELECTED_TUTOR_KEY)) || null; }
    catch { return null; }
}

function openScheduleFromTutorPage() {
    const name = document.querySelector('.tutor-main h1, .tutor-info h1')?.textContent.trim() || '';
    const subject = document.querySelector('.tutor-subject-chip')?.textContent.trim()
        || document.querySelector('.tutor-header a')?.textContent.trim()
        || document.querySelector('.tutor-header')?.textContent.trim()
        || '';
    const page = window.location.pathname.split('/').pop() || 'tutor.html';

    setSelectedTutor({ name: name, subject: subject, page: page });
    window.location.href = 'schedule.html';
}

/* ---------- Поиск репетиторов ---------- */

function normalizeSearch(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function searchTutors(query) {
    const q = normalizeSearch(query);
    if (!q) return TUTORS_CATALOG.slice();

    return TUTORS_CATALOG.filter(tutor => {
        const hay = normalizeSearch([
            tutor.name,
            tutor.subject,
            tutor.grades,
            `${tutor.grades} класс`,
            `${tutor.grades} классы`,
            `от ${tutor.price}`
        ].join(' '));
        return q.split(' ').every(part => part && hay.includes(part));
    });
}

function getTutorByPage(page) {
    const key = String(page || '').split('/').pop();
    return TUTORS_CATALOG.find(t => t.page === key) || null;
}

/* ---------- Избранные репетиторы ---------- */

function getFavoritesStore() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || {}; }
    catch { return {}; }
}

function saveFavoritesStore(store) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(store));
}

function getUserFavorites() {
    const user = getCurrentUser();
    if (!user) return [];
    const store = getFavoritesStore();
    const list = Array.isArray(store[user.email]) ? store[user.email] : [];
    return list;
}

function isFavoriteTutor(page) {
    const key = String(page || '').split('/').pop();
    return getUserFavorites().some(item => item.page === key);
}

function toggleFavoriteTutor(tutorInfo) {
    const user = getCurrentUser();
    if (!user) {
        return { ok: false, needAuth: true, error: 'Войдите, чтобы сохранять избранное' };
    }

    const page = String(tutorInfo.page || '').split('/').pop();
    if (!page) return { ok: false, error: 'Неизвестный репетитор' };

    const store = getFavoritesStore();
    const list = Array.isArray(store[user.email]) ? store[user.email].slice() : [];
    const index = list.findIndex(item => item.page === page);

    if (index >= 0) {
        list.splice(index, 1);
        store[user.email] = list;
        saveFavoritesStore(store);
        return { ok: true, favorited: false, list: list };
    }

    const fromCatalog = getTutorByPage(page);
    list.unshift({
        page: page,
        name: tutorInfo.name || fromCatalog?.name || 'Репетитор',
        subject: tutorInfo.subject || fromCatalog?.subject || '',
        grades: tutorInfo.grades || fromCatalog?.grades || '',
        price: tutorInfo.price || fromCatalog?.price || null,
        savedAt: Date.now()
    });
    store[user.email] = list;
    saveFavoritesStore(store);
    return { ok: true, favorited: true, list: list };
}

function removeFavoriteTutor(page) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: 'Нужно войти в аккаунт' };

    const key = String(page || '').split('/').pop();
    const store = getFavoritesStore();
    const list = Array.isArray(store[user.email]) ? store[user.email] : [];
    const next = list.filter(item => item.page !== key);
    store[user.email] = next;
    saveFavoritesStore(store);
    return { ok: true, list: next };
}

function initFavoriteButton(button) {
    if (!button) return;

    const page = window.location.pathname.split('/').pop() || 'tutor.html';
    const catalog = getTutorByPage(page);
    const name = document.querySelector('.tutor-main h1')?.textContent.trim() || catalog?.name || '';
    const chip = document.querySelector('.tutor-subject-chip')?.textContent.trim() || '';
    const subject = catalog?.subject || chip.split(',')[0]?.trim() || '';
    const grades = catalog?.grades || '';
    const price = catalog?.price || null;

    function sync() {
        const active = isFavoriteTutor(page);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.innerHTML = active
            ? '<span aria-hidden="true">♥</span> В избранном'
            : '<span aria-hidden="true">♡</span> В избранное';
    }

    sync();
    button.addEventListener('click', function () {
        const result = toggleFavoriteTutor({ page, name, subject, grades, price });
        if (result.needAuth) {
            window.location.href = 'login.html';
            return;
        }
        if (!result.ok) {
            alert(result.error || 'Не удалось обновить избранное');
            return;
        }
        sync();
    });
}

/* ---------- Toast-уведомления ---------- */

function showToast(message, options = {}) {
    const existing = document.querySelector('.site-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'site-toast';
    toast.setAttribute('role', 'status');

    const text = document.createElement('p');
    text.textContent = message;
    toast.appendChild(text);

    if (options.actionHref && options.actionLabel) {
        const action = document.createElement('a');
        action.href = options.actionHref;
        action.className = 'site-toast-action';
        action.textContent = options.actionLabel;
        toast.appendChild(action);
    }

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    const ttl = options.duration || 4500;
    window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => toast.remove(), 280);
    }, ttl);
}

/* ---------- Кнопка «Наверх» и общие мелочи ---------- */

function initBackToTop() {
    if (document.querySelector('.back-to-top')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Наверх');
    btn.innerHTML = '<span aria-hidden="true">↑</span>';
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    const sync = () => {
        btn.classList.toggle('is-visible', window.scrollY > 420);
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
}

function initRevealAnimations() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(el => {
        if (!el.classList.contains('is-visible')) observer.observe(el);
    });
}

function initPwa() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

function initMobileNav() {
    const header = document.querySelector('body > header, header');
    if (!header) return;
    const nav = header.querySelector('nav');
    if (!nav || header.querySelector('.nav-toggle')) return;

    nav.classList.add('site-nav');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Открыть меню');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';

    const logo = header.querySelector('.logo');
    if (logo && logo.nextSibling) header.insertBefore(btn, logo.nextSibling);
    else header.appendChild(btn);

    const setOpen = (open) => {
        header.classList.toggle('nav-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        document.body.classList.toggle('nav-lock', open);
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!header.classList.contains('nav-open'));
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('click', (e) => {
        if (!header.contains(e.target)) setOpen(false);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 860) setOpen(false);
    });
}

function enhanceFooterContacts() {
    document.querySelectorAll('footer.site-footer').forEach(footer => {
        if (footer.querySelector('.footer-contacts')) return;

        const row = document.createElement('div');
        row.className = 'footer-contacts';
        row.innerHTML = `
            <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
            <a href="${CONTACT_TG_CHANNEL}" target="_blank" rel="noopener noreferrer">${CONTACT_TG_CHANNEL_HANDLE}</a>
            <a href="${CONTACT_TG_CHAT}" target="_blank" rel="noopener noreferrer">${CONTACT_TG_CHAT_HANDLE}</a>
        `;
        footer.appendChild(row);
    });
}

function initSiteChrome() {
    initMobileNav();
    initBackToTop();
    initRevealAnimations();
    initPwa();
    enhanceFooterContacts();
}

/* ---------- Шапка: кабинет / войти ---------- */

function initAuthNav() {
    const user = getCurrentUser();
    const profileIcon = document.querySelector('.profile-icon');

    if (profileIcon) {
        const href = user ? 'profile.html' : 'login.html';
        if (profileIcon.tagName === 'A') {
            profileIcon.setAttribute('href', href);
        } else {
            profileIcon.addEventListener('click', () => {
                window.location.href = href;
            });
            profileIcon.setAttribute('title', user ? 'Личный кабинет' : 'Войти');
            profileIcon.setAttribute('role', 'link');
        }
        profileIcon.setAttribute('aria-label', user ? 'Личный кабинет' : 'Войти');
    }

    initSiteChrome();

    if (!user) return;

    document.querySelectorAll('nav a').forEach(link => {
        const text = link.textContent.trim();
        if (text === 'Войти' || link.getAttribute('href') === 'login.html') {
            link.textContent = user.name;
            link.setAttribute('href', 'profile.html');
            link.classList.add('user-name-link');
            link.title = 'Личный кабинет';
        }
    });
}
