const STORAGE_KEYS = {
    language: 'portfolioLanguage',
    overridePrefix: 'portfolioContentOverride_',
    legacyOverride: 'portfolioContentOverride'
};

document.addEventListener('DOMContentLoaded', async () => {
    const availableLanguages = ['en', 'vi'];
    const params = new URLSearchParams(window.location.search);

    const requestedLang = params.get('lang');
    const currentLanguage = resolveLanguage(requestedLang, availableLanguages);
    const projectId = params.get('id');

    localStorage.setItem(STORAGE_KEYS.language, currentLanguage);

    let baseContent = {};
    try {
        const response = await fetch(`locales/${currentLanguage}.json?v=3.0`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        baseContent = await response.json();
    } catch (e) {
        console.error("Failed to load language file:", e);
    }

    const content = loadStoredContent(baseContent, currentLanguage);
    const project = findProjectById(content.projects || [], projectId);

    setupLanguageSwitcher(availableLanguages, currentLanguage, projectId);
    renderProjectPage(content, project, currentLanguage);
});

function resolveLanguage(requested, available) {
    if (requested && available.includes(requested)) {
        return requested;
    }

    const preferred = localStorage.getItem(STORAGE_KEYS.language);
    if (preferred && available.includes(preferred)) {
        return preferred;
    }

    const defaultLanguage = window.PORTFOLIO_DEFAULT_LANGUAGE;
    if (defaultLanguage && available.includes(defaultLanguage)) {
        return defaultLanguage;
    }

    return available.includes('en') ? 'en' : available[0];
}

function getOverrideKey(language) {
    return `${STORAGE_KEYS.overridePrefix}${language}`;
}

function loadStoredContent(baseContent, language) {
    try {
        const scopedRaw = localStorage.getItem(getOverrideKey(language));
        const legacyRaw = localStorage.getItem(STORAGE_KEYS.legacyOverride);
        const raw = scopedRaw || legacyRaw;

        if (!raw) {
            return baseContent;
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return mergeLocalizedContent(baseContent, parsed);
        }
    } catch (error) {
        console.warn('Failed to parse saved content override:', error);
    }

    return baseContent;
}

function mergeLocalizedContent(baseContent, overrideContent) {
    const merged = deepMerge(baseContent, overrideContent);
    if (Array.isArray(baseContent.projects) || Array.isArray(overrideContent.projects)) {
        merged.projects = mergeProjectsById(baseContent.projects || [], overrideContent.projects || []);
    }
    return merged;
}

function deepMerge(baseValue, overrideValue) {
    if (Array.isArray(overrideValue)) {
        return overrideValue.slice();
    }

    if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
        return overrideValue;
    }

    const result = { ...baseValue };
    Object.keys(overrideValue).forEach((key) => {
        const baseChild = baseValue[key];
        const overrideChild = overrideValue[key];

        if (isPlainObject(baseChild) && isPlainObject(overrideChild)) {
            result[key] = deepMerge(baseChild, overrideChild);
            return;
        }

        if (Array.isArray(overrideChild)) {
            result[key] = overrideChild.slice();
            return;
        }

        result[key] = overrideChild;
    });

    return result;
}

function mergeProjectsById(baseProjects, overrideProjects) {
    const orderedIds = [];
    const map = new Map();

    baseProjects.forEach((project) => {
        const id = String(project.id);
        orderedIds.push(id);
        map.set(id, { ...project });
    });

    overrideProjects.forEach((project) => {
        const id = String(project.id);
        if (!map.has(id)) {
            orderedIds.push(id);
        }

        const existing = map.get(id) || {};
        map.set(id, { ...existing, ...project });
    });

    return orderedIds.map((id) => map.get(id)).filter(Boolean);
}

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}

function findProjectById(projects, id) {
    if (!id) {
        return projects[0] || null;
    }
    return projects.find((project) => String(project.id) === String(id)) || projects[0] || null;
}

function setupLanguageSwitcher(availableLanguages, currentLanguage, projectId) {
    const switcher = document.getElementById('lang-switch');
    if (!switcher) {
        return;
    }

    const buttons = switcher.querySelectorAll('.lang-btn');
    buttons.forEach((button) => {
        const lang = button.getAttribute('data-lang');
        const isAvailable = availableLanguages.includes(lang);

        button.disabled = !isAvailable;
        button.classList.toggle('active', lang === currentLanguage);

        button.addEventListener('click', () => {
            if (!isAvailable || lang === currentLanguage) {
                return;
            }

            localStorage.setItem(STORAGE_KEYS.language, lang);
            const target = `project.html?id=${encodeURIComponent(projectId || '')}&lang=${encodeURIComponent(lang)}`;
            window.location.href = target;
        });
    });
}

function renderProjectPage(content, project, language) {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';

    const fallbackTitle = language === 'vi' ? 'Chi tiet du an' : 'Project Detail';
    const backLabel = '←';
    const overviewLabel = language === 'vi' ? 'Tổng quan dự án' : 'Project Overview';

    const backLink = document.getElementById('project-back');
    if (backLink) {
        backLink.textContent = backLabel;
        backLink.setAttribute('href', `index.html#projects`);
    }

    if (!project) {
        document.title = fallbackTitle;
        setText('project-title', fallbackTitle);
        setText('project-subtitle', language === 'vi' ? 'Kh\u00f4ng t\u00ecm th\u1ea5y d\u1ef1 \u00e1n.' : 'Project not found.');
        setText('project-about-heading', overviewLabel);
        setText('project-description', '');
        return;
    }

    document.title = `${project.title} | LAMON-DIY`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    const descriptionText = project.description ? project.description.substring(0, 150) + "..." : "Project Detail";
    metaDesc.content = project.subtitle || descriptionText;

    const ogTags = [
        { property: 'og:title', content: document.title },
        { property: 'og:description', content: metaDesc.content },
        { property: 'og:image', content: project.image || '' },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: window.location.href }
    ];

    ogTags.forEach(tagData => {
        let metaTag = document.querySelector(`meta[property="${tagData.property}"]`);
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('property', tagData.property);
            document.head.appendChild(metaTag);
        }
        metaTag.content = tagData.content;
    });

    const projectCategory = project.category || project.subtitle || '';
    const projectLocation = project.location || '';

    setText('project-category', projectCategory);
    setText('project-title', project.title || '');
    setText('project-subtitle', project.subtitle || '');
    setText('project-location', projectLocation);
    setText('project-about-heading', overviewLabel);
    setText('project-description', project.description || '');

    const galleryEl = document.getElementById('project-gallery-grid');
    const images = Array.isArray(project.gallery) && project.gallery.length
        ? project.gallery
        : [project.image].filter(Boolean);

    galleryEl.innerHTML = images
        .map((src, index) => {
            const alt = project.alt || project.title || 'Project image';
            const mainClass = index === 0 ? 'project-gallery-item main' : 'project-gallery-item';
            return `<figure class="${mainClass}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" data-index="${index}"></figure>`;
        })
        .join('');

    renderCaseStudy(project, language, images);
    renderBeforeAfter(project, language, images);
    setupLightbox(images);
}

function renderCaseStudy(project, language, images) {
    const target = document.getElementById('project-case-study');
    if (!target) return;

    const labels = getProjectLabels(language);
    const defaultItems = [
        {
            title: labels.context,
            text: project.context || project.description || labels.contextText
        },
        {
            title: labels.idea,
            text: project.concept || buildConceptText(project, labels)
        },
        {
            title: labels.material,
            text: project.materials || labels.materialText
        },
        {
            title: labels.role,
            text: project.role || labels.roleText
        }
    ];

    const items = Array.isArray(project.caseStudy) && project.caseStudy.length
        ? project.caseStudy
        : defaultItems;

    const visual = project.caseStudyImage || images[1] || images[0] || project.image || '';

    target.innerHTML = `
        <div class="project-case-heading">
            <p>${escapeAttribute(labels.caseStudy)}</p>
            <h2>${escapeAttribute(labels.caseTitle)}</h2>
        </div>
        <div class="project-case-layout">
            <div class="project-case-grid">
                ${items.map((item) => `
                    <article class="project-case-item">
                        <h3>${escapeAttribute(item.title || '')}</h3>
                        <p>${escapeAttribute(item.text || item.description || '')}</p>
                    </article>
                `).join('')}
            </div>
            ${visual ? `
                <figure class="project-case-visual">
                    <img src="${escapeAttribute(visual)}" alt="${escapeAttribute(project.title || 'Case study visual')}" loading="lazy">
                </figure>
            ` : ''}
        </div>
    `;
}

function renderBeforeAfter(project, language, images) {
    const target = document.getElementById('project-before-after');
    if (!target) return;

    const labels = getProjectLabels(language);
    const beforeAfter = project.beforeAfter || {};
    const before = beforeAfter.before || images[1] || images[0] || '';
    const after = beforeAfter.after || images[0] || images[1] || '';

    if (!before || !after || before === after) {
        target.innerHTML = '';
        return;
    }

    target.innerHTML = `
        <div class="project-case-heading">
            <p>${escapeAttribute(labels.transformation)}</p>
            <h2>${escapeAttribute(labels.beforeAfter)}</h2>
        </div>
        <div class="before-after-grid">
            <figure>
                <span>${escapeAttribute(labels.before)}</span>
                <img src="${escapeAttribute(before)}" alt="${escapeAttribute(labels.before)}" loading="lazy">
            </figure>
            <figure>
                <span>${escapeAttribute(labels.after)}</span>
                <img src="${escapeAttribute(after)}" alt="${escapeAttribute(labels.after)}" loading="lazy">
            </figure>
        </div>
    `;
}

function getProjectLabels(language) {
    if (language === 'vi') {
        return {
            caseStudy: 'Case Study',
            caseTitle: 'Cach du an duoc hinh thanh',
            context: 'Boi canh',
            idea: 'Y tuong thiet ke',
            material: 'Vat lieu & cay xanh',
            role: 'Vai tro',
            contextText: 'Du an bat dau tu viec doc hien trang, nhu cau su dung va cam xuc ma khong gian can tao ra.',
            materialText: 'Bang vat lieu, anh sang va lop cay xanh duoc chon de can bang tham my, bao tri va trai nghiem hang ngay.',
            roleText: 'Phu trach dinh huong y tuong, bo cuc khong gian, ngon ngu vat lieu va ho tro trien khai.',
            conceptPrefix: 'Y tuong tap trung vao',
            transformation: 'Chuyen doi khong gian',
            beforeAfter: 'Before / After',
            before: 'Before',
            after: 'After'
        };
    }

    return {
        caseStudy: 'Case Study',
        caseTitle: 'How the project takes shape',
        context: 'Context',
        idea: 'Design idea',
        material: 'Materials & planting',
        role: 'Role',
        contextText: 'The project starts by reading the site, the daily needs, and the feeling the space should create.',
        materialText: 'Materials, lighting, and planting layers are selected to balance atmosphere, maintenance, and everyday use.',
        roleText: 'Responsible for concept direction, spatial composition, material language, and design development support.',
        conceptPrefix: 'The concept focuses on',
        transformation: 'Spatial transformation',
        beforeAfter: 'Before / After',
        before: 'Before',
        after: 'After'
    };
}

function buildConceptText(project, labels) {
    const topic = project.category || project.subtitle || project.title || 'a clear spatial experience';
    return `${labels.conceptPrefix} ${topic.toLowerCase()}, using proportion, circulation, and atmosphere to make the project memorable and practical.`;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value || '';
    }
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function setupLightbox(images) {
    if (!images || images.length === 0) return;

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    if (!lightbox || !lightboxImg) return;

    let currentIndex = 0;

    function openLightbox(index) {
        currentIndex = index;
        lightboxImg.src = images[currentIndex];
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (!lightbox.classList.contains('active')) {
                lightboxImg.src = '';
            }
        }, 400); 
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        lightboxImg.src = images[currentIndex];
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lightboxImg.src = images[currentIndex];
    }

    const gridImages = document.querySelectorAll('.project-gallery-item img');
    gridImages.forEach(img => {
        img.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            if (!isNaN(idx)) openLightbox(idx);
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (nextBtn) nextBtn.addEventListener('click', showNext);
    if (prevBtn) prevBtn.addEventListener('click', showPrev);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });
}
