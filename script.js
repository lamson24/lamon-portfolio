const STORAGE_KEYS = {
    language: 'portfolioLanguage',
    overridePrefix: 'portfolioContentOverride_',
    legacyOverride: 'portfolioContentOverride'
};

document.addEventListener('DOMContentLoaded', async () => {
    const availableLanguages = ['en', 'vi'];
    const currentLanguage = getCurrentLanguage(availableLanguages);

    let baseContent = {};
    try {
        const response = await fetch(`locales/${currentLanguage}.json?v=2.1`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        baseContent = await response.json();
    } catch (e) {
        console.error("Failed to load language file:", e);
    }

    const content = loadStoredContent(baseContent, currentLanguage);
    initializeContent(content, currentLanguage);

    setupNavbarScroll();
    setupRevealAnimations();
    setupCounters();
    setupRouter();
    setupMobileMenu();
    setupProjectNavigation(currentLanguage);
    setupLanguageSwitcher(availableLanguages, currentLanguage);
    setupCmsEditor(baseContent, content, currentLanguage);
    setupThemeToggle();
});

function getCurrentLanguage(availableLanguages) {
    const preferred = localStorage.getItem(STORAGE_KEYS.language);
    if (preferred && availableLanguages.includes(preferred)) {
        return preferred;
    }

    const defaultLanguage = window.PORTFOLIO_DEFAULT_LANGUAGE;
    if (defaultLanguage && availableLanguages.includes(defaultLanguage)) {
        return defaultLanguage;
    }

    return availableLanguages.includes('en') ? 'en' : availableLanguages[0];
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

    return orderedIds
        .map((id) => map.get(id))
        .filter((project) => project && project.id != null);
}

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
function setupLanguageSwitcher(availableLanguages, currentLanguage) {
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
            window.location.reload();
        });
    });
}

function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    // Check if user previously saved a theme preference
    const savedTheme = localStorage.getItem('portfolioTheme');
    
    // Check system preference if no saved theme
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.body.classList.add('light-mode');
    }

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLightMode = document.body.classList.contains('light-mode');
        
        localStorage.setItem('portfolioTheme', isLightMode ? 'light' : 'dark');
    });
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value === 'string') {
        el.textContent = value;
    }
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value === 'string') {
        el.innerHTML = value;
    }
}

function initializeContent(content, language) {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';

    if (content.seo) {
        if (content.seo.title) {
            document.title = content.seo.title;
        }

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && content.seo.description) {
            metaDesc.setAttribute('content', content.seo.description);
        }
    }

    if (content.brand) {
        setHTML('site-logo', content.brand.name);
    }

    if (content.nav) {
        setText('nav-about', content.nav.about);
        setText('nav-projects', content.nav.projects);
        setText('nav-contact', content.nav.contact);
    }

    if (content.hero) {
        setHTML('hero-title', `${escapeHtml(content.hero.title || '')}<br><span class="highlight-serif">${escapeHtml(content.hero.highlight || '')}</span>`);
        setText('hero-subtitle', content.hero.subtitle);
        setText('hero-cta', content.hero.cta);
        setText('hero-credibility', content.hero.credibilityLine);

        const showreelBtn = document.getElementById('hero-showreel');
        if (showreelBtn && content.hero.showreelId) {
            showreelBtn.style.display = 'inline-flex';
            setText('hero-showreel-text', content.hero.showreel);
            showreelBtn.onclick = () => openVideoModal(content.hero.showreelId);
        } else if (showreelBtn) {
            showreelBtn.style.display = 'none';
        }
    }

    if (content.about) {
        setHTML('about-title', `${escapeHtml(content.about.title || '')} <span class="highlight-serif">${escapeHtml(content.about.highlight || '')}</span>`);

        const paragraphsEl = document.getElementById('about-paragraphs');
        if (paragraphsEl && Array.isArray(content.about.paragraphs)) {
            paragraphsEl.innerHTML = content.about.paragraphs
                .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
                .join('');
        }

        const aboutImg = document.getElementById('about-image');
        if (aboutImg && content.about.image) {
            aboutImg.src = content.about.image;
            aboutImg.alt = content.about.imageAlt || '';
        }
    }

    if (content.impact && Array.isArray(content.impact)) {
        const impactGrid = document.getElementById('impact-grid');
        if (impactGrid) {
            impactGrid.innerHTML = content.impact.map((item, id) => `
                <div class="impact-item reveal" style="transition-delay: ${id * 0.15}s;">
                    <div class="impact-number-wrapper">
                        <span class="impact-number" data-target="${escapeHtml(item.number)}">0</span>
                        <span class="impact-suffix">${escapeHtml(item.suffix)}</span>
                    </div>
                    <div class="impact-label">${escapeHtml(item.label)}</div>
                </div>
            `).join('');
        }
    }

    if (content.services) {
        setHTML('services-title', escapeHtml(content.services.title || ''));
        const servicesListEl = document.getElementById('services-list');
        if (servicesListEl && Array.isArray(content.services.items)) {
            servicesListEl.innerHTML = content.services.items
                .map((item) => `
                    <div class="service-item reveal">
                        <h3>${escapeHtml(item.title || '')}</h3>
                        <p>${escapeHtml(item.desc || '')}</p>
                    </div>
                `)
                .join('');
        }
    }

    if (content.process) {
        setHTML('process-title', `${escapeHtml(content.process.title || '')} <span class="highlight-serif">${escapeHtml(content.process.highlight || '')}</span>`);
        const processListEl = document.getElementById('process-list');
        if (processListEl && Array.isArray(content.process.items)) {
            processListEl.innerHTML = content.process.items
                .map((item, index) => {
                    const delay = index * 0.15;
                    return `
                    <div class="process-step reveal" style="transition-delay: ${delay}s;">
                        <span class="process-num">${escapeHtml(item.step)}</span>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>${escapeHtml(item.desc)}</p>
                    </div>
                    `;
                }).join('');
        }
    }

    if (content.testimonials && Array.isArray(content.testimonials.items)) {
        setHTML('testimonials-title', `${escapeHtml(content.testimonials.title || '')} <span class="highlight-serif">${escapeHtml(content.testimonials.highlight || '')}</span>`);
        const testimonialsGrid = document.getElementById('testimonials-grid');
        if (testimonialsGrid) {
            testimonialsGrid.innerHTML = content.testimonials.items.map((item, index) => `
                <div class="testimonial-card reveal" style="transition-delay: ${index * 0.15}s;">
                    <p class="testimonial-quote">"${escapeHtml(item.quote)}"</p>
                    <div class="testimonial-author">
                        <h4>${escapeHtml(item.author)}</h4>
                        <p>${escapeHtml(item.role)}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    if (content.projectsSection) {
        setHTML('projects-title', `${escapeHtml(content.projectsSection.title || '')} <span class="highlight-serif">${escapeHtml(content.projectsSection.highlight || '')}</span>`);
    }

    renderProjects(content.projects, language);
    renderSignatureProjects(content.projects, language);

    if (content.contact) {
        setHTML('contact-title', `${escapeHtml(content.contact.title || '')} <span class="highlight-serif">${escapeHtml(content.contact.highlight || '')}</span>`);
        setText('contact-subtitle', content.contact.subtitle);

        const contactEmail = document.getElementById('contact-email');
        if (contactEmail && content.contact.email) {
            contactEmail.textContent = content.contact.email;
            contactEmail.href = `mailto:${content.contact.email}`;
        }
        const contactPhone = document.getElementById('contact-phone');
        if (contactPhone && content.contact.phone) {
            contactPhone.textContent = content.contact.phone;
            contactPhone.href = `tel:${content.contact.phone.replace(/\s/g, '')}`;
        }
        setText('contact-location', content.contact.location);

        const contactCta = document.getElementById('contact-toggle-btn');
        if (contactCta && content.contact.cta) {
            contactCta.textContent = content.contact.cta;
        }

        if (content.contact.form) {
            const formName = document.getElementById('form-name');
            const formEmail = document.getElementById('form-email');
            const formPhone = document.getElementById('form-phone');
            const formAddress = document.getElementById('form-address');
            const formMessage = document.getElementById('form-message');
            const formSubmit = document.getElementById('form-submit');
            
            if (formName) formName.placeholder = content.contact.form.name;
            if (formEmail) formEmail.placeholder = content.contact.form.email;
            if (formPhone) formPhone.placeholder = content.contact.form.phone;
            if (formAddress) formAddress.placeholder = content.contact.form.address;
            if (formMessage) formMessage.placeholder = content.contact.form.message;
            if (formSubmit) formSubmit.textContent = content.contact.form.submit;
        }
        
        setupContactForm(content.contact.form?.success);
    }

    if (content.footer) {
        setHTML('footer-copyright', content.footer.copyright);

        const socialsEl = document.getElementById('social-links');
        if (socialsEl && Array.isArray(content.footer.socials)) {
            socialsEl.innerHTML = content.footer.socials
                .map((item) => `<a href="${escapeAttribute(item.href || '#')}">${escapeHtml(item.label || '')}</a>`)
                .join('');
        }
    }

    return;
}

function renderProjects(projects, language) {
    const gallery = document.getElementById('project-gallery');
    if (!gallery || !Array.isArray(projects)) {
        return;
    }

    const validProjects = projects.filter((project) => project.id !== '7' && project.id !== '5');

    // Dynamic Filter Menu Logic
    const categoriesSet = new Set();
    validProjects.forEach(p => {
        const cat = p.category || p.subtitle;
        if (cat) categoriesSet.add(cat);
    });
    
    const categories = ['All', ...Array.from(categoriesSet)];
    const filtersContainer = document.getElementById('project-filters');
    
    if (filtersContainer && categories.length > 1) {
        filtersContainer.innerHTML = categories.map(cat => 
            `<button class="filter-btn ${cat === 'All' ? 'active' : ''}" data-filter="${escapeAttribute(cat)}">${escapeHtml(cat)}</button>`
        ).join('');

        const btns = filtersContainer.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filterValue = btn.getAttribute('data-filter');
                const links = gallery.querySelectorAll('.project-link');
                
                links.forEach(link => {
                    const cardCat = link.getAttribute('data-category');
                    if (filterValue === 'All' || cardCat === filterValue) {
                        link.classList.remove('hidden-by-filter');
                    } else {
                        link.classList.add('hidden-by-filter');
                    }
                });
            });
        });
    }

    gallery.innerHTML = validProjects
        .map((project, index) => {
            const transitionDelay = (index % 3) * 0.1;
            const style = transitionDelay ? ` style="transition-delay: ${transitionDelay}s;"` : '';
            const id = escapeAttribute(String(project.id || index + 1));
            const href = `project.html?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(language)}`;

            const category = project.category || project.subtitle || '';
            const location = project.location || '';
            const yearStr = location ? `${location}` : '';

            return `
                <a class="project-link" href="${href}" aria-label="Open ${escapeAttribute(project.title || 'Project')}" data-category="${escapeAttribute(category)}">
                    <div class="project-card reveal"${style} data-project-id="${id}">
                        <div class="project-image-wrapper">
                            <img src="${escapeAttribute(project.image || '')}" alt="${escapeAttribute(project.alt || category)}" loading="lazy" class="project-img">
                            <div class="project-overlay">
                                <h3>${escapeHtml(project.title || '')}</h3>
                                <p>${escapeHtml(category)}</p>
                                <p class="project-meta">${escapeHtml(yearStr)}</p>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        })
        .join('');
}

function renderSignatureProjects(projects, language) {
    const signatureList = document.getElementById('signature-list');
    if (!signatureList || !Array.isArray(projects)) {
        return;
    }

    const signatureIds = ['7', '5'];
    const sigProjects = projects.filter(p => signatureIds.includes(String(p.id)));

    signatureList.innerHTML = sigProjects
        .map((project, index) => {
            const id = escapeAttribute(String(project.id || index + 1));
            const href = `project.html?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(language)}`;
            
            return `
                <div class="signature-project reveal" data-project-id="${id}">
                    <div class="signature-image-wrapper">
                        <img src="${escapeAttribute(project.image || '')}" alt="${escapeAttribute(project.alt || '')}" loading="lazy" class="signature-img">
                    </div>
                    <div class="signature-content">
                        <h2>${escapeHtml(project.title || '')}</h2>
                        <p>${escapeHtml(project.description || '')}</p>
                        <a href="${href}" class="btn-primary">View Project</a>
                    </div>
                </div>
            `;
        })
        .join('');
}

function setupProjectNavigation(language) {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card) => {
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const id = card.getAttribute('data-project-id');
                window.location.href = `project.html?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(language)}`;
            }
        });
    });
}
function setupNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) {
        return;
    }

    let collapseTimer = null;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
            navbar.classList.remove('nav-expanded');
        }
    });

    // Expand on mouseenter
    navbar.addEventListener('mouseenter', () => {
        if (navbar.classList.contains('scrolled')) {
            clearTimeout(collapseTimer);
            navbar.classList.add('nav-expanded');
        }
    });

    // Collapse on mouseleave with a small delay to prevent flicker
    navbar.addEventListener('mouseleave', () => {
        if (navbar.classList.contains('scrolled')) {
            collapseTimer = setTimeout(() => {
                navbar.classList.remove('nav-expanded');
            }, 300);
        }
    });

    // Also toggle on click for touch devices
    navbar.addEventListener('click', (e) => {
        if (navbar.classList.contains('scrolled') && !e.target.closest('a, button')) {
            navbar.classList.toggle('nav-expanded');
        }
    });
}

function setupRevealAnimations() {
    function refreshRevealObserver() {
        const revealElements = document.querySelectorAll('.reveal:not(.revealed)');
        revealElements.forEach((el) => revealObserver.observe(el));
    }

    // IntersectionObserver for fade-in reveal
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -20px 0px'
    });

    // Initial observation
    refreshRevealObserver();

    // Attach to window so router can call it
    window.refreshRevealAnimations = refreshRevealObserver;

    // Add scroll-fade class to all major sections
    const sections = document.querySelectorAll('.about, .services, .signature-projects, .projects, .contact, .hero-content');
    sections.forEach((section) => section.classList.add('scroll-fade'));

    // Continuous scroll handler for fade-out as sections leave the top
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateScrollFade();
                ticking = false;
            });
            ticking = true;
        }
    });

    function updateScrollFade() {
        const viewportHeight = window.innerHeight;

        document.querySelectorAll('.scroll-fade').forEach((el) => {
            const rect = el.getBoundingClientRect();
            const elTop = rect.top;
            const elBottom = rect.bottom;

            // Fade OUT when the element is leaving the top of the viewport
            if (elBottom < viewportHeight && elBottom > 0 && elTop < 0) {
                // Element is partially above the viewport
                const visibleRatio = elBottom / rect.height;
                const opacity = Math.max(0, Math.min(1, visibleRatio));
                const translateY = (1 - opacity) * -30;
                el.style.opacity = opacity;
                el.style.transform = `translateY(${translateY}px)`;
            } else if (elBottom <= 0) {
                // Fully scrolled past — hide
                el.style.opacity = '0';
                el.style.transform = 'translateY(-30px)';
            } else {
                // In view or below — fully visible
                el.style.opacity = '';
                el.style.transform = '';
            }
        });
    }
}

function setupCounters() {
    const counters = document.querySelectorAll('.impact-number');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                const duration = 2000;
                const increment = target / (duration / 16); 

                let current = 0;
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.innerText = Math.ceil(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.innerText = target;
                    }
                };
                
                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.1 });

    counters.forEach(counter => observer.observe(counter));
}

function setupRouter() {
    function handleRoute() {
        let hash = window.location.hash;
        if (!hash || hash === '#') hash = '#home';

        const validPages = ['#home', '#about', '#projects', '#contact'];
        const pageName = validPages.includes(hash) ? hash.substring(1) : 'home';

        document.querySelectorAll('[data-page]').forEach(el => {
            if (el.getAttribute('data-page') === pageName) {
                el.classList.add('page-active');
            } else {
                el.classList.remove('page-active');
            }
        });

        // Instantly reset scroll to simulate a page transition
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Update nav active links
        document.querySelectorAll('.nav-links a').forEach(a => {
            if (a.getAttribute('href') === '#' + pageName) {
                a.classList.add('nav-active');
            } else {
                a.classList.remove('nav-active');
            }
        });

        // Re-trigger reveal check for the new page
        if (typeof window.refreshRevealAnimations === 'function') {
            window.refreshRevealAnimations();
        }
        
        // Slight delay to ensure display: block has taken effect before scroll check
        setTimeout(() => {
            window.dispatchEvent(new Event('scroll'));
        }, 100);
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute(); 
}

function setupContactForm(successMsgText) {
    const toggleBtn = document.getElementById('contact-toggle-btn');
    const formContainer = document.getElementById('contact-form');
    const successMsg = document.getElementById('form-success-msg');

    if (!toggleBtn || !formContainer) return;

    // Remove old listeners to avoid duplicates if called multiple times (e.g. from CMS editor)
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    const newFormContainer = formContainer.cloneNode(true);
    formContainer.parentNode.replaceChild(newFormContainer, formContainer);

    newToggleBtn.addEventListener('click', () => {
        newFormContainer.classList.toggle('hidden');
        if (!newFormContainer.classList.contains('hidden')) {
            // small delay to allow display:block to apply before animating opacity/transform via .active
            setTimeout(() => {
                newFormContainer.classList.add('active');
            }, 10);
        } else {
            newFormContainer.classList.remove('active');
        }
    });

    newFormContainer.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = newFormContainer.querySelector('button[type="submit"]');
        if (submitBtn) {
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner" style="display:inline-block; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; width: 14px; height: 14px; animation: spin 1s linear infinite; margin-right: 8px; vertical-align: middle;"></span> Sending...';
            
            // Add keyframes dynamically if they don't exist
            if (!document.getElementById('spin-anim')) {
                const style = document.createElement('style');
                style.id = 'spin-anim';
                style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }

            try {
                const formData = new FormData(newFormContainer);
                const response = await fetch(newFormContainer.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Accept: 'application/json'
                    }
                });

                let data = {};
                try {
                    data = await response.json();
                } catch (parseError) {
                    data = {};
                }

                if (response.ok || data.success) {
                    // Hide inputs/button
                    const formGroups = newFormContainer.querySelectorAll('.form-group');
                    formGroups.forEach(g => g.classList.add('hidden'));
                    
                    submitBtn.classList.add('hidden');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;

                    // Show success message
                    const newSuccessMsg = newFormContainer.querySelector('#form-success-msg');
                    if (newSuccessMsg) {
                        newSuccessMsg.textContent = successMsgText || 'Message sent successfully!';
                        newSuccessMsg.classList.remove('hidden');
                    }
                } else {
                    const message = data.message || 'Please try again later.';
                    console.error('Form submission failed:', message);
                    alert('Sending failed: ' + message);
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred connecting to the server. Please check your internet connection.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    });
}

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    if (!hamburger) {
        return;
    }

    hamburger.addEventListener('click', () => {
        alert('Mobile menu opens here in a full implementation.');
    });
}

function setupModal(projectData) {
    const modal = document.getElementById('project-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalDesc = document.getElementById('modal-desc');
    const closeBtn = document.querySelector('.close-btn');

    if (!modal || !modalImg || !modalTitle || !modalSubtitle || !modalDesc || !closeBtn) {
        return;
    }

    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach((card) => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-project-id');
            const data = projectData[id];

            if (!data) {
                return;
            }

            modalImg.src = data.img;
            modalTitle.textContent = data.title;
            modalSubtitle.textContent = data.subtitle;
            modalDesc.textContent = data.desc;

            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeModal() {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';

        setTimeout(() => {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
        }, 300);
    }

    const classObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' && modal.classList.contains('show')) {
                modal.style.display = 'flex';
            }
        });
    });
    classObserver.observe(modal, { attributes: true });

    closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}



function setupCmsEditor(baseContent, activeContent, language) {
    const panel = document.createElement('aside');
    panel.className = 'cms-panel';
    panel.setAttribute('aria-hidden', 'true');

    panel.innerHTML = `
        <div class="cms-panel-header">
            <h3>CMS Mini (${language.toUpperCase()})</h3>
            <button type="button" class="cms-close" aria-label="Close editor">x</button>
        </div>
        <p class="cms-note">Edit JSON for current language, then click Apply.</p>
        <textarea class="cms-json" spellcheck="false"></textarea>
        <input type="file" class="cms-file-input" accept=".json,application/json">
        <div class="cms-actions">
            <button type="button" class="cms-btn cms-apply">Apply</button>
            <button type="button" class="cms-btn cms-import">Import JSON</button>
            <button type="button" class="cms-btn cms-download">Download JSON</button>
            <button type="button" class="cms-btn cms-reset">Reset</button>
        </div>
        <p class="cms-status" aria-live="polite"></p>
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'cms-toggle';
    toggleBtn.textContent = `CMS ${language.toUpperCase()}`;

    document.body.appendChild(panel);
    document.body.appendChild(toggleBtn);

    const textarea = panel.querySelector('.cms-json');
    const fileInput = panel.querySelector('.cms-file-input');
    const closeBtn = panel.querySelector('.cms-close');
    const applyBtn = panel.querySelector('.cms-apply');
    const importBtn = panel.querySelector('.cms-import');
    const downloadBtn = panel.querySelector('.cms-download');
    const resetBtn = panel.querySelector('.cms-reset');
    const statusEl = panel.querySelector('.cms-status');

    const setStatus = (message, isError) => {
        statusEl.textContent = message;
        statusEl.classList.toggle('error', Boolean(isError));
    };

    const openPanel = () => {
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
    };

    const closePanel = () => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
    };

    toggleBtn.addEventListener('click', () => {
        if (panel.classList.contains('open')) {
            closePanel();
        } else {
            openPanel();
            textarea.focus();
        }
    });

    closeBtn.addEventListener('click', closePanel);

    textarea.value = JSON.stringify(activeContent, null, 2);

    applyBtn.addEventListener('click', () => {
        try {
            const parsed = JSON.parse(textarea.value);
            localStorage.setItem(getOverrideKey(language), JSON.stringify(parsed));
            localStorage.removeItem(STORAGE_KEYS.legacyOverride);
            setStatus('Saved. Reloading preview...', false);
            window.location.reload();
        } catch (error) {
            setStatus(`JSON error: ${error.message}`, true);
        }
    });

    importBtn.addEventListener('click', () => {
        if (fileInput) {
            fileInput.click();
        }
    });

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const [file] = fileInput.files || [];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const fileText = String(reader.result || '');
                    const parsed = JSON.parse(fileText);
                    textarea.value = JSON.stringify(parsed, null, 2);
                    setStatus(`Loaded ${file.name}. Click Apply to use it.`, false);
                } catch (error) {
                    setStatus(`JSON error: ${error.message}`, true);
                }
            };

            reader.onerror = () => {
                setStatus(`Failed to read ${file.name}.`, true);
            };

            reader.readAsText(file);
            fileInput.value = '';
        });
    }

    downloadBtn.addEventListener('click', () => {
        try {
            const parsed = JSON.parse(textarea.value);
            const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `portfolio-content-${language}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setStatus(`Downloaded portfolio-content-${language}.json`, false);
        } catch (error) {
            setStatus(`JSON error: ${error.message}`, true);
        }
    });

    resetBtn.addEventListener('click', () => {
        localStorage.removeItem(getOverrideKey(language));
        localStorage.removeItem(STORAGE_KEYS.legacyOverride);
        textarea.value = JSON.stringify(baseContent, null, 2);
        setStatus('Reset to default. Reloading preview...', false);
        window.location.reload();
    });

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            if (panel.classList.contains('open')) {
                closePanel();
            } else {
                openPanel();
                textarea.focus();
            }
        }

        if (event.key === 'Escape' && panel.classList.contains('open')) {
            closePanel();
        }
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function openVideoModal(videoId) {
    let modal = document.getElementById('video-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'video-modal';
        modal.className = 'video-modal';
        modal.innerHTML = `
            <button class="video-modal-close" aria-label="Close video">&times;</button>
            <div class="video-wrapper">
                <iframe id="video-iframe" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.video-modal-close').onclick = closeVideoModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeVideoModal();
        };
    }
    
    document.getElementById('video-iframe').src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.classList.add('active');
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            document.getElementById('video-iframe').src = '';
        }, 400); // clear src to stop playing after fade out
    }
}
