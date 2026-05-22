// =========================================
// 3D PARTICLE PRELOADER EXPLOSION
// =========================================

let preloaderScene, preloaderCamera, preloaderRenderer, particles;
let preloaderAnimationId;
let explosionTriggered = false;

function initPreloader() {
    const canvas = document.getElementById('preloader-canvas');
    const container = document.getElementById('preloader-3d');
    if (!canvas || !container) return;

    // 1. Setup Scene
    preloaderScene = new THREE.Scene();
    
    // 2. Setup Camera
    preloaderCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    preloaderCamera.position.z = 150;

    // 3. Setup Renderer
    preloaderRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    preloaderRenderer.setSize(window.innerWidth, window.innerHeight);
    preloaderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Create Particles (Sphere)
    const particleCount = 15000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Target positions for explosion
    const targetPositions = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0xfff1b3); // Light gold/white
    const color2 = new THREE.Color(0xc8a96a); // Warm gold
    const color3 = new THREE.Color(0xd16d3b); // Deep orange/copper

    for (let i = 0; i < particleCount; i++) {
        // Random spherical coordinates
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        // Sphere radius
        let radius = 40 + (Math.random() * 5); 
        
        // Convert to Cartesian coordinates
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Assign colors based on y-height to create a gradient effect
        const yRatio = (y + 45) / 90; // 0 to 1
        const mixedColor = new THREE.Color();
        if (yRatio > 0.6) {
            mixedColor.lerpColors(color2, color1, (yRatio - 0.6) * 2.5);
        } else {
            mixedColor.lerpColors(color3, color2, yRatio * 1.6);
        }
        
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
        
        // Calculate target positions for explosion (fly outward)
        const explodeFactor = 5 + Math.random() * 10;
        targetPositions[i * 3] = x * explodeFactor;
        targetPositions[i * 3 + 1] = y * explodeFactor;
        targetPositions[i * 3 + 2] = z * explodeFactor + (Math.random() * 200);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Store target positions
    geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));

    // Custom Shader Material for better looking particles
    const material = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    preloaderScene.add(particles);

    // 5. Animation Loop
    let time = 0;
    function animate() {
        if (!preloaderScene) return;
        preloaderAnimationId = requestAnimationFrame(animate);

        // Slow rotation during loading
        if (!explosionTriggered && particles) {
            particles.rotation.y += 0.005;
            particles.rotation.x += 0.002;
            
            // Subtle breathing effect
            time += 0.05;
            const scale = 1 + Math.sin(time) * 0.02;
            particles.scale.set(scale, scale, scale);
        }

        preloaderRenderer.render(preloaderScene, preloaderCamera);
    }
    animate();

    // 6. Handle Resize
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    if (!preloaderCamera || !preloaderRenderer) return;
    preloaderCamera.aspect = window.innerWidth / window.innerHeight;
    preloaderCamera.updateProjectionMatrix();
    preloaderRenderer.setSize(window.innerWidth, window.innerHeight);
}

// 7. Explode Animation
function explodeParticles() {
    if (!particles || explosionTriggered) return;
    explosionTriggered = true;

    const positions = particles.geometry.attributes.position.array;
    const targets = particles.geometry.attributes.targetPosition.array;
    
    // Animate the geometry vertices manually using GSAP dummy object
    const dummy = { progress: 0 };
    
    // Play a cinematic zoom out before explosion
    gsap.to(particles.scale, {
        x: 0.8, y: 0.8, z: 0.8,
        duration: 0.5,
        ease: "power2.in"
    });

    gsap.to(dummy, {
        progress: 1,
        duration: 2.0,
        ease: "expo.out",
        delay: 0.5,
        onUpdate: () => {
            const p = dummy.progress;
            // Interpolate positions
            for (let i = 0; i < positions.length; i++) {
                // start position is essentially positions[i] but we need original. 
                // Since we modify it in place, it's safer to use an array, but for simplicity:
                // We use standard GSAP array animation or just move vertices
            }
            // A more performant way to explode without storing original array:
            // Just scale the whole particle system massively while fading out
            particles.scale.set(1 + p*15, 1 + p*15, 1 + p*15);
            particles.material.opacity = 0.8 * (1 - p);
        },
        onComplete: () => {
            // Fade out the black background
            gsap.to('#preloader-3d', {
                opacity: 0,
                duration: 0.8,
                onComplete: () => {
                    document.getElementById('preloader-3d').style.display = 'none';
                    cleanupPreloader();
                    // Dispatch event for upgrade.js to start the Hero text animation
                    window.dispatchEvent(new Event('preloaderComplete'));
                }
            });
        }
    });
}

function cleanupPreloader() {
    if (preloaderAnimationId) cancelAnimationFrame(preloaderAnimationId);
    if (particles) {
        particles.geometry.dispose();
        particles.material.dispose();
        preloaderScene.remove(particles);
    }
    if (preloaderRenderer) {
        preloaderRenderer.dispose();
    }
    preloaderScene = null;
    preloaderCamera = null;
    preloaderRenderer = null;
    particles = null;
    window.removeEventListener('resize', onWindowResize);
}

// Start immediately
initPreloader();

let isPortfolioLoaded = false;
let userClicked = false;

// Listen to script.js telling us that JSON and images are loaded
window.addEventListener('portfolioLoaded', () => {
    isPortfolioLoaded = true;
    
    // Add an instruction text
    const container = document.getElementById('preloader-3d');
    const instruction = document.createElement('div');
    instruction.innerText = "Click to Explore";
    instruction.style.position = 'absolute';
    instruction.style.bottom = '10%';
    instruction.style.color = 'rgba(255,255,255,0.5)';
    instruction.style.fontFamily = "'Outfit', sans-serif";
    instruction.style.letterSpacing = '5px';
    instruction.style.textTransform = 'uppercase';
    instruction.style.fontSize = '0.9rem';
    instruction.style.pointerEvents = 'none';
    instruction.style.opacity = '0';
    instruction.style.transition = 'opacity 1s ease';
    instruction.id = 'preloader-instruction';
    container.appendChild(instruction);
    
    // Fade in instruction
    setTimeout(() => {
        if (!explosionTriggered) instruction.style.opacity = '1';
    }, 500);

    if (userClicked) {
        instruction.style.opacity = '0';
        explodeParticles();
    }
});

document.getElementById('preloader-3d').addEventListener('click', () => {
    userClicked = true;
    const instruction = document.getElementById('preloader-instruction');
    if (instruction) instruction.style.opacity = '0';
    
    if (isPortfolioLoaded && !explosionTriggered) {
        explodeParticles();
    }
});
