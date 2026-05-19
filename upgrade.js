// =========================================
// NEW UX/UI UPGRADES: CURSOR, TRANSITIONS, PARALLAX
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    setupCustomCursor();
    setupPageTransition();
    setupGSAPParallax();
    setupImageBlurUp();
});

function setupCustomCursor() {
    // Only show custom cursor on devices that support fine pointers (mouse)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('custom-cursor-follower');
    if (!cursor || !follower) return;

    // Show cursor elements
    cursor.style.opacity = '1';
    follower.style.opacity = '1';

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let followerX = mouseX;
    let followerY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function renderCursor() {
        // Fast follow for the small dot
        cursorX += (mouseX - cursorX) * 0.5;
        cursorY += (mouseY - cursorY) * 0.5;
        
        // Slower follow for the larger circle
        followerX += (mouseX - followerX) * 0.15;
        followerY += (mouseY - followerY) * 0.15;

        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        follower.style.transform = `translate(${followerX}px, ${followerY}px)`;

        requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Hover effect function
    const bindHoverEvents = () => {
        const hoverElements = document.querySelectorAll('a, button, .project-card, .handmade-card, input, textarea, .project-gallery-item img');
        hoverElements.forEach(el => {
            // avoid binding multiple times
            if (el.dataset.cursorBound) return;
            el.dataset.cursorBound = "true";

            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hover');
                follower.classList.add('hover');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hover');
                follower.classList.remove('hover');
            });
        });
    };

    // Initial bind
    bindHoverEvents();

    // Re-bind when new content is loaded (e.g., hash router or dynamic projects)
    window.addEventListener('hashchange', () => {
        setTimeout(bindHoverEvents, 200);
    });

    // We can also observe the DOM for new nodes to bind cursor events automatically
    const observer = new MutationObserver(() => {
        bindHoverEvents();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function setupPageTransition() {
    const transitionEl = document.getElementById('page-transition');
    if (!transitionEl || typeof gsap === 'undefined') return;

    // Entrance animation
    gsap.to(transitionEl, {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.8,
        ease: "power4.inOut"
    });

    // Exit animation (intercept links)
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        const target = link.getAttribute('target');
        
        // Skip hash links, external links, mailto/tel, or empty links
        if (!href || href.startsWith('#') || target === '_blank' || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        e.preventDefault();
        
        // Ensure transition overlay goes up
        gsap.to(transitionEl, {
            scaleY: 1,
            transformOrigin: "top",
            duration: 0.6,
            ease: "power4.inOut",
            onComplete: () => {
                window.location.href = href;
            }
        });
    });
}

function setupGSAPParallax() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // 1. Hero video parallax
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        gsap.to(heroVideo, {
            y: "30%",
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }

    // 2. About image parallax
    const aboutImageWrapper = document.querySelector('.about-image-wrapper');
    const aboutImage = document.querySelector('.about-img');
    if (aboutImageWrapper && aboutImage) {
        gsap.to(aboutImage, {
            y: "15%",
            ease: "none",
            scrollTrigger: {
                trigger: aboutImageWrapper,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    }

    // 3. Staggered reveal for Project Cards
    const observeCards = () => {
        const cards = document.querySelectorAll('.project-card:not(.gsap-revealed), .handmade-card:not(.gsap-revealed)');
        if (cards.length === 0) return;

        cards.forEach(card => card.classList.add('gsap-revealed'));

        gsap.from(cards, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: cards[0].parentElement,
                start: "top 85%"
            }
        });
    };

    setTimeout(observeCards, 500);
    const observer = new MutationObserver((mutations) => {
        let hasNewCards = false;
        mutations.forEach(m => {
            if (m.addedNodes.length) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.classList.contains('project-card') || node.classList.contains('handmade-card') || node.querySelector('.project-card') || node.querySelector('.handmade-card'))) {
                        hasNewCards = true;
                    }
                });
            }
        });
        if (hasNewCards) {
            ScrollTrigger.refresh();
            observeCards();
        }
    });
    const mainContainer = document.querySelector('main') || document.body;
    observer.observe(mainContainer, { childList: true, subtree: true });
}

// =========================================
// PROJECT FILTERING ANIMATION
// =========================================
window.animateProjectFilter = function(filterValue) {
    const gallery = document.getElementById('project-gallery');
    if (!gallery || typeof gsap === 'undefined') return;
    const links = Array.from(gallery.querySelectorAll('.project-link'));

    // Animate out
    gsap.to(links, {
        scale: 0.9,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
            // Toggle display
            links.forEach(link => {
                const cardCat = link.getAttribute('data-filter-val');
                if (filterValue === 'all' || cardCat === filterValue) {
                    link.style.display = '';
                    link.classList.remove('hidden-by-filter');
                } else {
                    link.style.display = 'none';
                    link.classList.add('hidden-by-filter');
                }
            });

            // Re-trigger ScrollTrigger if exists
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();

            // Animate in visible ones
            const visibleLinks = links.filter(link => link.style.display !== 'none');
            gsap.fromTo(visibleLinks,
                { scale: 0.9, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "all" }
            );
        }
    });
};

// =========================================
// LAZY LOADING & BLUR-UP
// =========================================
function setupImageBlurUp() {
    const attachBlurUp = () => {
        const blurImages = document.querySelectorAll('.blur-up:not(.blur-bound)');
        blurImages.forEach(img => {
            img.classList.add('blur-bound');

            const onLoaded = () => {
                img.classList.add('loaded');
                if (img.parentElement.classList.contains('img-placeholder')) {
                    img.parentElement.classList.remove('loading');
                }
            };

            // If already loaded (e.g. from cache)
            if (img.complete) {
                onLoaded();
            } else {
                img.addEventListener('load', onLoaded);
            }
        });
    };

    // Initial check
    attachBlurUp();

    // Observe for dynamic DOM changes (e.g. JSON fetched projects)
    const observer = new MutationObserver((mutations) => {
        let hasNewImages = false;
        mutations.forEach(m => {
            if (m.addedNodes.length) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.classList.contains('blur-up') || node.querySelector('.blur-up'))) {
                        hasNewImages = true;
                    }
                });
            }
        });
        if (hasNewImages) attachBlurUp();
    });

    const mainContainer = document.querySelector('main') || document.body;
    observer.observe(mainContainer, { childList: true, subtree: true });
}
