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

    const fallbackTitle = language === 'vi' ? 'Chi tiết dự án' : 'Project Detail';
    const backLabel = '←';
    const overviewLabel = language === 'vi' ? 'Tổng quan dự án' : 'Project Overview';

    const backLink = document.getElementById('project-back');
    if (backLink) {
        backLink.textContent = backLabel;
        backLink.setAttribute('href', project && project.type ? `works.html?category=${project.type}` : 'index.html');
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

    const projectLocation = project.location || '';

    setText('project-category', buildProjectHeader(project));
    setText('project-title', project.title || '');
    setText('project-subtitle', project.subtitle || '');
    setText('project-location', projectLocation);
    setText('project-about-heading', overviewLabel);
    setText('project-description', project.description || '');

    const galleryEl = document.getElementById('project-gallery-grid');
    const images = Array.isArray(project.gallery) && project.gallery.length
        ? project.gallery
        : [project.image].filter(Boolean);

    renderProjectGallery(galleryEl, project, images);
    renderProjectMeta(project, language);

    renderCaseStudy(project, language, images);
    renderBeforeAfter(project, language, images);
    setupLightbox(images);
}

function renderProjectGallery(target, project, images) {
    if (!target) return;

    const alt = project.alt || project.title || 'Project image';
    if (!images.length) {
        target.innerHTML = '';
        return;
    }

    const maxThumbs = 5;
    const hasMore = images.length > maxThumbs;
    const visibleThumbIndexes = hasMore
        ? [...Array(maxThumbs - 1).keys()].concat(maxThumbs - 1)
        : images.map((_, index) => index);
    const hiddenCount = hasMore ? images.length - (maxThumbs - 1) : 0;

    target.innerHTML = `
        <figure class="project-gallery-item project-gallery-main" data-index="0">
            <img src="${escapeAttribute(images[0])}" alt="${escapeAttribute(alt)}" loading="eager" data-index="0">
        </figure>
        <div class="project-thumb-strip" aria-label="Project gallery thumbnails">
            ${visibleThumbIndexes.map((imageIndex, thumbIndex) => {
                const isMoreTile = hasMore && thumbIndex === visibleThumbIndexes.length - 1;
                return `
                    <figure class="project-gallery-item project-gallery-thumb${isMoreTile ? ' has-more' : ''}" data-index="${imageIndex}">
                        <img src="${escapeAttribute(images[imageIndex])}" alt="${escapeAttribute(alt)}" loading="lazy" data-index="${imageIndex}">
                        ${isMoreTile ? `<span class="project-thumb-more">+ ${hiddenCount}</span>` : ''}
                    </figure>
                `;
            }).join('')}
        </div>
    `;
}

function renderProjectMeta(project, language) {
    const target = document.getElementById('project-meta');
    if (!target) return;

    const labels = getProjectLabels(language);
    const items = [
        {
            icon: 'designer',
            label: labels.metaDesigner,
            value: project.architects || project.designer || project.author || 'LAMON-DIY'
        },
        {
            icon: 'location',
            label: labels.metaLocation,
            value: project.location || project.subtitle || ''
        },
        {
            icon: 'calendar',
            label: labels.metaYear,
            value: project.year || ''
        },
        {
            icon: 'category',
            label: labels.metaCategory,
            value: project.category || project.subType || project.type || ''
        },
        {
            icon: 'area',
            label: labels.metaArea,
            value: project.area || ''
        },
        {
            icon: 'materials',
            label: labels.metaMaterials,
            value: project.manufacturers || project.materials || ''
        }
    ].filter((item) => item.value);

    target.innerHTML = items.map((item) => `
        <div class="project-meta-row">
            <span class="project-meta-icon" aria-hidden="true">${getMetaIcon(item.icon)}</span>
            <p><strong>${escapeAttribute(item.label)}:</strong> ${escapeAttribute(item.value)}</p>
        </div>
    `).join('');
}

function buildProjectHeader(project) {
    const headerParts = [
        project.category || project.subType || project.type || '',
        project.location || project.subtitle || ''
    ].filter(Boolean);

    return headerParts.join(' \u2022 ');
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
            caseTitle: 'Cách dự án được hình thành',
            context: 'Bối cảnh',
            idea: 'Ý tưởng thiết kế',
            material: 'Vật liệu & cây xanh',
            role: 'Vai trò',
            contextText: 'Dự án bắt đầu từ việc đọc hiện trạng, nhu cầu sử dụng và cảm xúc mà không gian cần tạo ra.',
            materialText: 'Bảng vật liệu, ánh sáng và lớp cây xanh được chọn để cân bằng thẩm mỹ, bảo trì và trải nghiệm hằng ngày.',
            roleText: 'Phụ trách định hướng ý tưởng, bố cục không gian, ngôn ngữ vật liệu và hỗ trợ triển khai.',
            conceptPrefix: 'Ý tưởng tập trung vào',
            conceptSuffix: 'sử dụng tỷ lệ, luồng di chuyển và bầu không khí để dự án vừa đáng nhớ vừa thực tế.',
            conceptFallback: 'một trải nghiệm không gian rõ ràng',
            locale: 'vi-VN',
            metaDesigner: 'Thiết kế',
            metaLocation: 'Địa điểm',
            metaYear: 'Năm',
            metaCategory: 'Hạng mục',
            metaArea: 'Diện tích',
            metaMaterials: 'Vật liệu',
            transformation: 'Chuyển đổi không gian',
            beforeAfter: 'Trước / Sau',
            before: 'Trước',
            after: 'Sau'
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
        conceptSuffix: 'using proportion, circulation, and atmosphere to make the project memorable and practical.',
        conceptFallback: 'a clear spatial experience',
        locale: 'en',
        metaDesigner: 'Architects',
        metaLocation: 'Location',
        metaYear: 'Year',
        metaCategory: 'Category',
        metaArea: 'Area',
        metaMaterials: 'Materials',
        transformation: 'Spatial transformation',
        beforeAfter: 'Before / After',
        before: 'Before',
        after: 'After'
    };
}

function buildConceptText(project, labels) {
    const topic = project.category || project.subtitle || project.title || labels.conceptFallback;
    const normalizedTopic = String(topic).toLocaleLowerCase(labels.locale || undefined);
    return `${labels.conceptPrefix} ${normalizedTopic}, ${labels.conceptSuffix}`;
}

function getMetaIcon(type) {
    const icons = {
        designer: '<svg viewBox="0 0 24 24"><path d="M4 20v-2a4 4 0 0 1 4-4h1"/><circle cx="9" cy="7" r="3"/><path d="M14 20l6-6"/><path d="M15 13l2 2"/><path d="M18 10l2 2"/></svg>',
        location: '<svg viewBox="0 0 24 24"><path d="M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
        calendar: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/></svg>',
        category: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/><path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5l8 4.5 8-4.5"/></svg>',
        area: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 4v16"/><path d="M16 4v16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>',
        materials: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v10l-8 4-8-4V7l8-4z"/><path d="M12 12l8-5"/><path d="M12 12v9"/><path d="M12 12L4 7"/></svg>'
    };

    return icons[type] || icons.category;
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

    const galleryItems = document.querySelectorAll('.project-gallery-item');
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const idx = parseInt(item.getAttribute('data-index'), 10);
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
