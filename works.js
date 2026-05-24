document.addEventListener('DOMContentLoaded', () => {
    let currentLanguage = localStorage.getItem('portfolioLanguage') || 'en';
    const langBtns = document.querySelectorAll('.lang-btn');

    // Get category from URL
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || 'company';

    function initLanguage() {
        langBtns.forEach(btn => {
            if (btn.getAttribute('data-lang') === currentLanguage) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        loadData(currentLanguage);
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (lang !== currentLanguage) {
                currentLanguage = lang;
                localStorage.setItem('portfolioLanguage', lang);
                initLanguage();
            }
        });
    });

    async function loadData(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await fetchCustomData(await response.json());
            renderContent(data, lang);
        } catch (error) {
            console.error('Error loading language data:', error);
            // Fallback content if loading fails
            renderContent({
                nav: { about: "Philosophy", projects: "Work", company: "Company", personal: "Personal", handmade: "Handmade", contact: "Contact" },
                projects: []
            }, lang);
        }
    }

    async function fetchCustomData(defaultData) {
        try {
            const savedDataStr = localStorage.getItem('portfolioCustomData');
            if (savedDataStr) {
                const savedData = JSON.parse(savedDataStr);
                return { ...defaultData, ...savedData };
            }
            return defaultData;
        } catch (e) {
            return defaultData;
        }
    }

    function renderContent(data, lang) {
        // Nav translations
        if (data.nav) {
            const elNames = ['nav-about', 'nav-projects', 'nav-company', 'nav-personal', 'nav-handmade', 'nav-contact'];
            elNames.forEach(id => {
                const el = document.getElementById(id);
                const key = id.replace('nav-', '');
                if (el && data.nav[key]) el.textContent = data.nav[key];
            });
            
            // Set page title based on category
            const worksTitle = document.getElementById('works-title');
            if (worksTitle && data.nav[category]) {
                worksTitle.textContent = data.nav[category];
            }
        }

        // Render projects
        if (data.projects) {
            renderProjects(data.projects, lang, data.projectsSection || {});
        }
    }

    function renderProjects(projects, language, projectsSection) {
        const gallery = document.getElementById('project-gallery');
        if (!gallery || !Array.isArray(projects)) return;

        // Filter projects for the current category
        const categoryProjects = projects.filter(p => p.type === category && p.id !== '7' && p.id !== '5');

        // Render sub-filters for this category if available
        const subFiltersContainer = document.getElementById('project-filters-sub');
        let filters = projectsSection.filters || {};
        let subFilters = filters[category];

        if (subFiltersContainer && subFilters) {
            subFiltersContainer.innerHTML = Object.keys(subFilters).map(key =>
                `<button class="filter-btn sub-filter-btn ${key === 'all' ? 'active' : ''}" data-filter="${escapeAttribute(key)}">${escapeHtml(subFilters[key])}</button>`
            ).join('');

            const subBtns = subFiltersContainer.querySelectorAll('.filter-btn');
            subBtns.forEach(subBtn => {
                subBtn.addEventListener('click', () => {
                    subBtns.forEach(b => b.classList.remove('active'));
                    subBtn.classList.add('active');
                    applyFilters(subBtn.getAttribute('data-filter'));
                });
            });
        } else if (subFiltersContainer) {
            subFiltersContainer.innerHTML = '';
        }

        function applyFilters(subFilter) {
            const links = gallery.querySelectorAll('.project-link');
            let visibleCount = 0;
            
            links.forEach(link => {
                const pSubType = link.getAttribute('data-subtype');
                let show = false;
                
                if (subFilter === 'all' || !subFilter) {
                    show = true;
                } else if (pSubType === subFilter) {
                    show = true;
                }
                
                if (show) {
                    link.classList.remove('hidden-by-filter');
                    link.style.display = '';
                    const innerCard = link.querySelector('.project-card');
                    if (innerCard) {
                        innerCard.style.transitionDelay = `${(visibleCount % 3) * 0.1}s`;
                        innerCard.classList.remove('revealed');
                        void innerCard.offsetWidth;
                        innerCard.classList.add('revealed');
                    }
                    visibleCount++;
                } else {
                    link.classList.add('hidden-by-filter');
                    link.style.display = 'none';
                }
            });
            
            if (typeof window.ScrollTrigger !== 'undefined') {
                window.ScrollTrigger.refresh();
            }
        }

        gallery.innerHTML = categoryProjects
            .map((project, index) => {
                const transitionDelay = (index % 3) * 0.1;
                const style = transitionDelay ? ` style="transition-delay: ${transitionDelay}s;"` : '';
                const id = escapeAttribute(String(project.id || index + 1));
                const href = `project.html?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(language)}`;

                const catLabel = project.category || project.subtitle || '';
                const location = project.location || '';
                const yearStr = location ? `${location}` : '';
                const type = project.type || 'company';
                const subType = project.subType || 'all';

                return `
                    <a class="project-link" href="${href}" aria-label="Open ${escapeAttribute(project.title || 'Project')}" data-subtype="${escapeAttribute(subType)}">
                        <div class="project-card reveal"${style} data-project-id="${id}">
                            <div class="project-image-wrapper img-placeholder loading">
                                <img src="${escapeAttribute(project.image || '')}" alt="${escapeAttribute(project.alt || catLabel)}" loading="lazy" class="project-img blur-up">
                                <div class="project-overlay">
                                    <h3>${escapeHtml(project.title || '')}</h3>
                                    <p>${escapeHtml(catLabel)}</p>
                                    <p class="project-meta">${escapeHtml(yearStr)}</p>
                                </div>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
            
        // Initial reveal animation (since ScrollTrigger might not be setup exactly like homepage)
        setTimeout(() => {
            gallery.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
            applyFilters('all');
        }, 100);
    }

    // Utility functions duplicated from script.js to keep works.js standalone
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString().replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Set year in footer
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

    // Theme setup
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('portfolioTheme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.body.classList.add('light-mode');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLightMode = document.body.classList.contains('light-mode');
            localStorage.setItem('portfolioTheme', isLightMode ? 'light' : 'dark');
        });
    }

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
        });
    }

    // Mobile specific logic for opening dropdown
    const navProjectsBtn = document.getElementById('nav-projects');
    if (navProjectsBtn) {
        navProjectsBtn.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault(); 
                const parent = navProjectsBtn.closest('.has-dropdown');
                if (parent) {
                    parent.classList.toggle('mobile-expanded');
                }
            }
        });
    }

    // Init
    initLanguage();
});
