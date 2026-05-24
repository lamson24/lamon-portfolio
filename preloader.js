// =========================================
// 3D TEXT PARTICLE PRELOADER EXPLOSION
// =========================================

let preloaderScene, preloaderCamera, preloaderRenderer, particles, backgroundStars;
let preloaderAnimationId;
let explosionTriggered = false;

let mouse = new THREE.Vector2(-9999, -9999);
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(32, 32, 30, 0, 2 * Math.PI, false);
    context.fillStyle = 'white';
    context.fill();
    return new THREE.CanvasTexture(canvas);
}

function getTextPixels(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.min(window.innerWidth, 1200);
    canvas.height = 400;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const fontSize = Math.min(canvas.width / 5, 200);
    ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = [];
    
    const step = 3; 
    
    for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
            const index = (y * canvas.width + x) * 4;
            if (imgData[index] > 128) {
                pixels.push({
                    x: x - canvas.width / 2,
                    y: -(y - canvas.height / 2) 
                });
            }
        }
    }
    return pixels;
}

function initPreloader() {
    const canvas = document.getElementById('preloader-canvas');
    const container = document.getElementById('preloader-3d');
    if (!canvas || !container) return;

    // Set canvas z-index
    canvas.style.position = 'relative';
    canvas.style.zIndex = '5';

    // Cinematic Loader Progress
    const progressEl = document.createElement('div');
    progressEl.id = 'preloader-progress';
    progressEl.innerText = "00%";
    progressEl.style.position = 'absolute';
    progressEl.style.bottom = '10%';
    progressEl.style.left = '50%';
    progressEl.style.transform = 'translateX(-50%)';
    progressEl.style.color = 'rgba(255,255,255,0.7)';
    progressEl.style.fontFamily = "'Outfit', sans-serif";
    progressEl.style.fontSize = '0.9rem';
    progressEl.style.fontWeight = '400';
    progressEl.style.letterSpacing = '5px';
    progressEl.style.pointerEvents = 'none';
    progressEl.style.zIndex = '10'; 
    container.appendChild(progressEl);

    // Instruction Text
    const instruction = document.createElement('div');
    instruction.innerText = "Click to Explore";
    instruction.style.position = 'absolute';
    instruction.style.bottom = '10%';
    instruction.style.left = '50%';
    instruction.style.transform = 'translateX(-50%)';
    instruction.style.color = 'rgba(255,255,255,0.7)';
    instruction.style.fontFamily = "'Outfit', sans-serif";
    instruction.style.letterSpacing = '5px';
    instruction.style.textTransform = 'uppercase';
    instruction.style.fontSize = '0.9rem';
    instruction.style.pointerEvents = 'none';
    instruction.style.opacity = '0';
    instruction.style.transition = 'opacity 1s ease';
    instruction.style.zIndex = '10';
    instruction.id = 'preloader-instruction';
    container.appendChild(instruction);

    preloaderScene = new THREE.Scene();
    preloaderCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    preloaderCamera.position.z = 100;

    preloaderRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    preloaderRenderer.setSize(window.innerWidth, window.innerHeight);
    preloaderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const pixels = getTextPixels("LáMON");
    const particleCount = pixels.length;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color(0xffffff); // Pure white
    const color2 = new THREE.Color(0xe0e5ec); // Silver metallic
    const color3 = new THREE.Color(0xaab4c0); // Steel metallic

    for (let i = 0; i < particleCount; i++) {
        // scale pixels and add depth
        const x = pixels[i].x * 0.25 + (Math.random() - 0.5) * 0.8;
        const y = pixels[i].y * 0.25 + (Math.random() - 0.5) * 0.8;
        const z = (Math.random() - 0.5) * 15; // increased depth for 3D volume

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;

        const zRatio = (z + 15) / 30; 
        const mixedColor = new THREE.Color();
        if (zRatio > 0.5) {
            mixedColor.lerpColors(color2, color1, (zRatio - 0.5) * 2);
        } else {
            mixedColor.lerpColors(color3, color2, zRatio * 2);
        }
        
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
        
        baseColors[i * 3] = mixedColor.r;
        baseColors[i * 3 + 1] = mixedColor.g;
        baseColors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('basePosition', new THREE.BufferAttribute(basePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('baseColor', new THREE.BufferAttribute(baseColors, 3));
    geometry.setAttribute('stateColor', new THREE.BufferAttribute(baseColors.slice(), 3));

    const material = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        map: createCircleTexture(),
        alphaTest: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    preloaderScene.add(particles);

    // Create Background Stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for(let i = 0; i < starCount; i++) {
        starPositions[i*3] = (Math.random() - 0.5) * 800; 
        starPositions[i*3+1] = (Math.random() - 0.5) * 800;
        starPositions[i*3+2] = -150 - Math.random() * 400; // deeply behind the text
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.2,
        transparent: true,
        opacity: 0.3,
        map: createCircleTexture(),
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    backgroundStars = new THREE.Points(starGeometry, starMaterial);
    preloaderScene.add(backgroundStars);

    let time = 0;
    const raycaster = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Text is mostly at z=0
    const mousePos3D = new THREE.Vector3();
    const hoverColor = new THREE.Color(0x8aff99); // bright energy green

    function animate() {
        if (!preloaderScene) return;
        preloaderAnimationId = requestAnimationFrame(animate);

        if (!explosionTriggered && particles) {
            // Subtle breathing and very slow float (disabled as per request)
            time += 0.02;
            
            if (backgroundStars) {
                backgroundStars.rotation.y += 0.0003;
                backgroundStars.rotation.z += 0.0001;
            }
            
            // particles.position.y = Math.sin(time) * 2;
            // particles.position.x = Math.cos(time * 0.5) * 1;
            
            const posAttr = particles.geometry.attributes.position;
            const baseAttr = particles.geometry.attributes.basePosition;
            const colAttr = particles.geometry.attributes.color;
            const baseColAttr = particles.geometry.attributes.baseColor;
            const stateAttr = particles.geometry.attributes.stateColor;
            
            const posArray = posAttr.array;
            const baseArray = baseAttr.array;
            const colArray = colAttr.array;
            const baseColArray = baseColAttr.array;
            const stateArray = stateAttr.array;
            
            let mouseHit = false;
            if (mouse.x !== -9999) {
                raycaster.setFromCamera(mouse, preloaderCamera);
                if (raycaster.ray.intersectPlane(mousePlane, mousePos3D)) {
                    particles.worldToLocal(mousePos3D);
                    mouseHit = true;
                }
            }

            for (let i = 0; i < particleCount; i++) {
                const ix = i * 3;
                const px = posArray[ix], py = posArray[ix+1], pz = posArray[ix+2];
                const bx = baseArray[ix], by = baseArray[ix+1], bz = baseArray[ix+2];
                
                let forceX = 0, forceY = 0, forceZ = 0;
                let colorHovered = false;

                if (mouseHit) {
                    const dx = mousePos3D.x - px;
                    const dy = mousePos3D.y - py;
                    const dz = mousePos3D.z - pz;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    const interactRadius = 15;
                    const interactRadiusSq = interactRadius * interactRadius;
                    
                    if (distSq < interactRadiusSq && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const force = (interactRadius - dist) / interactRadius;
                        forceX = -(dx / dist) * force * 2.0;
                        forceY = -(dy / dist) * force * 2.0;
                        forceZ = -(dz / dist) * force * 2.0;
                        colorHovered = true;
                    }
                }

                if (colorHovered) {
                    stateArray[ix] += (hoverColor.r - stateArray[ix]) * 0.2;
                    stateArray[ix+1] += (hoverColor.g - stateArray[ix+1]) * 0.2;
                    stateArray[ix+2] += (hoverColor.b - stateArray[ix+2]) * 0.2;
                } else {
                    stateArray[ix] += (baseColArray[ix] - stateArray[ix]) * 0.05;
                    stateArray[ix+1] += (baseColArray[ix+1] - stateArray[ix+1]) * 0.05;
                    stateArray[ix+2] += (baseColArray[ix+2] - stateArray[ix+2]) * 0.05;
                }
                
                // Twinkle (rung sáng hoàn toàn độc lập, ngẫu nhiên cho từng hạt)
                const hash = Math.sin(i * 12.9898) * 43758.5453;
                const phase = (hash - Math.floor(hash)) * Math.PI * 2;
                const twinkle = 0.6 + Math.sin(time * 0.8 + phase) * 0.5;

                colArray[ix] = Math.min(stateArray[ix] * twinkle, 1.0);
                colArray[ix+1] = Math.min(stateArray[ix+1] * twinkle, 1.0);
                colArray[ix+2] = Math.min(stateArray[ix+2] * twinkle, 1.0);
                
                // Jitter (rung lắc tự động)
                const jitterX = Math.sin(time * 4.0 + phase) * 0.15;
                const jitterY = Math.cos(time * 3.5 + phase * 1.5) * 0.15;
                const jitterZ = Math.sin(time * 3.0 + phase * 2.0) * 0.15;

                posArray[ix] += ((bx + jitterX) - posArray[ix]) * 0.05 + forceX;
                posArray[ix+1] += ((by + jitterY) - posArray[ix+1]) * 0.05 + forceY;
                posArray[ix+2] += ((bz + jitterZ) - posArray[ix+2]) * 0.05 + forceZ;
            }
            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;
        }

        preloaderRenderer.render(preloaderScene, preloaderCamera);
    }
    animate();

    window.addEventListener('resize', onWindowResize, false);

    // ===================================
    // PROGRESS LOADER LOGIC
    // ===================================
    const progressObj = { val: 0 };
    let progressFinished = false;
    let isPortfolioLoaded = window.portfolioLoadedFlag || false; 
    let clickReady = false;

    gsap.to(progressObj, {
        val: 100,
        duration: 2.5,
        ease: "power2.inOut",
        onUpdate: () => {
            progressEl.innerText = Math.floor(progressObj.val).toString().padStart(2, '0') + "%";
        },
        onComplete: () => {
            progressFinished = true;
            checkReady();
        }
    });

    window.addEventListener('portfolioLoaded', () => {
        isPortfolioLoaded = true;
        checkReady();
    });

    function checkReady() {
        if (isPortfolioLoaded && progressFinished && !explosionTriggered) {
            clickReady = true;
            gsap.to(progressEl, { opacity: 0, duration: 1 });
            instruction.style.opacity = '1';
        }
    }

    container.addEventListener('click', () => {
        if (clickReady && !explosionTriggered) {
            instruction.style.opacity = '0';
            explodeParticles();
        }
    });
}

function onWindowResize() {
    if (!preloaderCamera || !preloaderRenderer) return;
    preloaderCamera.aspect = window.innerWidth / window.innerHeight;
    preloaderCamera.updateProjectionMatrix();
    preloaderRenderer.setSize(window.innerWidth, window.innerHeight);
}

function explodeParticles() {
    if (!particles || explosionTriggered) return;
    explosionTriggered = true;

    // Dispatch event to start Hero animation slightly earlier than visual clear
    setTimeout(() => {
        window.dispatchEvent(new Event('preloaderComplete'));
    }, 800);

    // Camera Fly-Through
    gsap.to(preloaderCamera.position, {
        z: -50,
        duration: 1.5,
        ease: "power3.in"
    });

    // Add warp rotation
    gsap.to(particles.rotation, {
        z: Math.PI / 4,
        x: Math.random() * 0.5,
        y: Math.random() * 0.5,
        duration: 1.5,
        ease: "power2.in"
    });

    // Fade out particles
    gsap.to(particles.material, {
        opacity: 0,
        duration: 1.0,
        delay: 0.5,
        ease: "power2.inOut"
    });
    
    if (backgroundStars) {
        gsap.to(backgroundStars.material, {
            opacity: 0,
            duration: 1.0,
            delay: 0.5,
            ease: "power2.inOut"
        });
    }

    gsap.to('#preloader-3d', {
        opacity: 0,
        duration: 1.5,
        delay: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
            document.getElementById('preloader-3d').style.display = 'none';
            setTimeout(cleanupPreloader, 1000);
        }
    });
}

function cleanupPreloader() {
    if (preloaderAnimationId) cancelAnimationFrame(preloaderAnimationId);
    if (particles) {
        if(particles.material.map) particles.material.map.dispose();
        particles.geometry.dispose();
        particles.material.dispose();
        preloaderScene.remove(particles);
    }
    if (backgroundStars) {
        if(backgroundStars.material.map) backgroundStars.material.map.dispose();
        backgroundStars.geometry.dispose();
        backgroundStars.material.dispose();
        preloaderScene.remove(backgroundStars);
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

const navEntries = performance.getEntriesByType("navigation");
const isReload = navEntries.length > 0 && navEntries[0].type === "reload";
const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

if ((!sessionStorage.getItem('hasSeenPreloader') || isReload) && !isMobile) {
    sessionStorage.setItem('hasSeenPreloader', 'true');
    // Start when document fonts are likely ready (or immediately)
    if (document.fonts) {
        document.fonts.ready.then(() => {
            initPreloader();
        });
    } else {
        initPreloader();
    }
} else {
    // Already seen or is mobile device, just hide it immediately and trigger complete event
    const preloaderEl = document.getElementById('preloader-3d');
    if (preloaderEl) preloaderEl.style.display = 'none';
    setTimeout(() => {
        window.dispatchEvent(new Event('preloaderComplete'));
    }, 100);
}

