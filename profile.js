const PROFILE_STORAGE_KEY = 'portfolioProfileCv';

document.addEventListener('DOMContentLoaded', async () => {
    const language = resolveLanguage();
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';

    const baseProfile = await loadBaseProfile(language);
    let profile = mergeProfile(baseProfile, loadSavedProfile());

    renderProfile(profile);
    setupProfileEditor(profile, baseProfile, (nextProfile) => {
        profile = nextProfile;
        renderProfile(profile);
    });
});

function resolveLanguage() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('lang');
    if (requested === 'vi' || requested === 'en') return requested;

    const saved = localStorage.getItem('portfolioLanguage');
    return saved === 'vi' ? 'vi' : 'en';
}

async function loadBaseProfile(language) {
    try {
        const response = await fetch(`locales/${language}.json?v=3.0`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const content = await response.json();
        return normalizeProfile(content.profile || {});
    } catch (error) {
        console.error('Failed to load profile content:', error);
        return normalizeProfile({});
    }
}

function loadSavedProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.warn('Failed to parse saved profile:', error);
        return {};
    }
}

function mergeProfile(baseProfile, savedProfile) {
    const merged = { ...baseProfile };
    const textFields = ['name', 'role', 'location', 'email', 'phone', 'avatar', 'cover', 'summary'];

    textFields.forEach((field) => {
        if (typeof savedProfile[field] === 'string' && savedProfile[field].trim()) {
            merged[field] = savedProfile[field];
        }
    });

    ['skills', 'experience', 'education'].forEach((field) => {
        if (Array.isArray(savedProfile[field]) && savedProfile[field].length) {
            merged[field] = savedProfile[field];
        }
    });

    return normalizeProfile(merged);
}

function normalizeProfile(profile) {
    return {
        name: profile.name || 'LAMON-DIY',
        role: profile.role || 'Landscape Architect',
        location: profile.location || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar: profile.avatar || 'assets/hero_cover.jpg',
        cover: profile.cover || 'assets/hero_bg.png',
        summary: profile.summary || '',
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        experience: Array.isArray(profile.experience) ? profile.experience : [],
        education: Array.isArray(profile.education) ? profile.education : []
    };
}

function renderProfile(profile) {
    document.title = `${profile.name} | CV`;

    setText('profile-name', profile.name);
    setText('profile-role', profile.role);
    setText('profile-location', profile.location);
    setText('profile-summary', profile.summary);

    const cover = document.getElementById('profile-cover');
    if (cover) {
        cover.style.backgroundImage = `url("${escapeCssUrl(profile.avatar)}")`;
    }

    const email = document.getElementById('profile-email');
    if (email) {
        email.textContent = profile.email;
        email.href = profile.email ? `mailto:${profile.email}` : '#';
    }

    const phone = document.getElementById('profile-phone');
    if (phone) {
        phone.textContent = profile.phone;
        phone.href = profile.phone ? `tel:${profile.phone.replace(/\s/g, '')}` : '#';
    }

    const skills = document.getElementById('profile-skills');
    if (skills) {
        skills.innerHTML = profile.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join('');
    }

    renderTimeline('profile-experience', profile.experience);
    renderTimeline('profile-education', profile.education);
}

function renderTimeline(id, items) {
    const target = document.getElementById(id);
    if (!target) return;

    target.innerHTML = items.map((item) => {
        const hasStructuredTitle = Boolean(item.title);
        const title = item.title || item.place || item.period || '';
        const period = hasStructuredTitle ? item.period : '';
        const place = hasStructuredTitle ? item.place : '';

        return `
            <div class="profile-timeline-item">
                <span>${escapeHtml(period)}</span>
                <h3>${escapeHtml(title)}</h3>
                <strong>${escapeHtml(place)}</strong>
                <p>${escapeHtml(item.description || '')}</p>
            </div>
        `;
    }).join('');
}

function setupProfileEditor(profile, baseProfile, onSave) {
    const editor = document.getElementById('profile-editor');
    const form = document.getElementById('profile-form');
    const editBtn = document.getElementById('profile-edit-btn');
    const cancelBtn = document.getElementById('profile-cancel-btn');
    const resetBtn = document.getElementById('profile-reset-btn');
    if (!editor || !form || !editBtn || !cancelBtn || !resetBtn) return;

    let draftAvatar = profile.avatar;
    let draftCover = profile.cover;

    function openEditor() {
        fillForm(profile);
        draftAvatar = profile.avatar;
        draftCover = profile.cover;
        editor.classList.remove('hidden');
        editor.setAttribute('aria-hidden', 'false');
    }

    function closeEditor() {
        editor.classList.add('hidden');
        editor.setAttribute('aria-hidden', 'true');
    }

    editBtn.addEventListener('click', openEditor);
    cancelBtn.addEventListener('click', closeEditor);

    document.getElementById('edit-avatar-file')?.addEventListener('change', async (event) => {
        draftAvatar = await readImageFile(event.target.files?.[0], draftAvatar);
    });

    document.getElementById('edit-cover-file')?.addEventListener('change', async (event) => {
        draftCover = await readImageFile(event.target.files?.[0], draftCover);
    });

    resetBtn.addEventListener('click', () => {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        profile = baseProfile;
        onSave(baseProfile);
        closeEditor();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const nextProfile = normalizeProfile({
            name: getValue('edit-name'),
            role: getValue('edit-role'),
            location: getValue('edit-location'),
            email: getValue('edit-email'),
            phone: getValue('edit-phone'),
            summary: getValue('edit-summary'),
            avatar: draftAvatar,
            cover: draftCover,
            skills: parseList(getValue('edit-skills')),
            experience: parseTimeline(getValue('edit-experience')),
            education: parseTimeline(getValue('edit-education'))
        });

        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
        profile = nextProfile;
        onSave(nextProfile);
        closeEditor();
    });
}

function fillForm(profile) {
    setValue('edit-name', profile.name);
    setValue('edit-role', profile.role);
    setValue('edit-location', profile.location);
    setValue('edit-email', profile.email);
    setValue('edit-phone', profile.phone);
    setValue('edit-summary', profile.summary);
    setValue('edit-skills', profile.skills.join(', '));
    setValue('edit-experience', stringifyTimeline(profile.experience));
    setValue('edit-education', stringifyTimeline(profile.education));
}

function stringifyTimeline(items) {
    return items.map((item) => [
        item.period || '',
        item.title || '',
        item.place || '',
        item.description || ''
    ].join(' | ')).join('\n');
}

function parseList(value) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseTimeline(value) {
    return value.split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            if (!line.includes('|')) {
                return { period: '', title: line, place: '', description: '' };
            }

            const [period = '', title = '', place = '', description = ''] = line.split('|').map((part) => part.trim());
            return { period, title, place, description };
        });
}

function readImageFile(file, fallback) {
    if (!file) return Promise.resolve(fallback);
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || fallback);
        reader.onerror = () => resolve(fallback);
        reader.readAsDataURL(file);
    });
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value || '';
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || '';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeCssUrl(value) {
    return String(value || '').replace(/"/g, '\\"');
}
