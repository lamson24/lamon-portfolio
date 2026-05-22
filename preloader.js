// =========================================
// 3D PARTICLE PRELOADER EXPLOSION
// =========================================

let preloaderScene, preloaderCamera, preloaderRenderer, particles;
let preloaderAnimationId;
let explosionTriggered = false;

// Track mouse
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

function initPreloader() {
    const canvas = document.getElementById('preloader-canvas');
    const container = document.getElementById('preloader-3d');
    if (!canvas || !container) return;

    preloaderScene = new THREE.Scene();
    preloaderCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    preloaderCamera.position.z = 150;

    preloaderRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    preloaderRenderer.setSize(window.innerWidth, window.innerHeight);
    preloaderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color(0xfff1b3); // Light gold/white
    const color2 = new THREE.Color(0xc8a96a); // Warm gold
    const color3 = new THREE.Color(0xd16d3b); // Deep orange/copper

    for (let i = 0; i < particleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        let radius = 40 + (Math.random() * 5); 
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;

        const yRatio = (y + 45) / 90; 
        const mixedColor = new THREE.Color();
        if (yRatio > 0.6) {
            mixedColor.lerpColors(color2, color1, (yRatio - 0.6) * 2.5);
        } else {
            mixedColor.lerpColors(color3, color2, yRatio * 1.6);
        }
        
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('basePosition', new THREE.BufferAttribute(basePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        map: createCircleTexture(),
        alphaTest: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    preloaderScene.add(particles);

    let time = 0;
    const raycaster = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -40);
    const mousePos3D = new THREE.Vector3();

    function animate() {
        if (!preloaderScene) return;
        preloaderAnimationId = requestAnimationFrame(animate);

        if (!explosionTriggered && particles) {
            particles.rotation.y += 0.005;
            particles.rotation.x += 0.002;
            
            time += 0.05;
            const scale = 1 + Math.sin(time) * 0.02;
            particles.scale.set(scale, scale, scale);

            // Mouse interaction
            if (mouse.x !== -9999) {
                raycaster.setFromCamera(mouse, preloaderCamera);
                if (raycaster.ray.intersectPlane(mousePlane, mousePos3D)) {
                    particles.worldToLocal(mousePos3D);
                    
                    const posAttr = particles.geometry.attributes.position;
                    const baseAttr = particles.geometry.attributes.basePosition;
                    const posArray = posAttr.array;
                    const baseArray = baseAttr.array;
                    
                    for (let i = 0; i < particleCount; i++) {
                        const ix = i * 3;
                        const px = posArray[ix], py = posArray[ix+1], pz = posArray[ix+2];
                        const bx = baseArray[ix], by = baseArray[ix+1], bz = baseArray[ix+2];
                        
                        const dx = mousePos3D.x - px;
                        const dy = mousePos3D.y - py;
                        const dz = mousePos3D.z - pz;
                        const distSq = dx*dx + dy*dy + dz*dz;
                        
                        const interactRadius = 25;
                        const interactRadiusSq = interactRadius * interactRadius;
                        
                        if (distSq < interactRadiusSq && distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const force = (interactRadius - dist) / interactRadius;
                            posArray[ix] -= (dx / dist) * force * 1.5;
                            posArray[ix+1] -= (dy / dist) * force * 1.5;
                            posArray[ix+2] -= (dz / dist) * force * 1.5;
                        }
                        
                        // Spring back
                        posArray[ix] += (bx - posArray[ix]) * 0.05;
                        posArray[ix+1] += (by - posArray[ix+1]) * 0.05;
                        posArray[ix+2] += (bz - posArray[ix+2]) * 0.05;
                    }
                    posAttr.needsUpdate = true;
                }
            }
        }

        preloaderRenderer.render(preloaderScene, preloaderCamera);
    }
    animate();

    window.addEventListener('resize', onWindowResize, false);
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

    const dummy = { progress: 0 };
    
    gsap.to(particles.scale, {
        x: 0.8, y: 0.8, z: 0.8,
        duration: 0.5,
        ease: "power2.in"
    });

    gsap.to(dummy, {
        progress: 1,
        duration: 3.0,
        ease: "expo.out",
        delay: 0.5,
        onUpdate: () => {
            const p = dummy.progress;
            particles.scale.set(1 + p*25, 1 + p*25, 1 + p*25);
            particles.material.opacity = 0.8 * (1 - p);
        },
        onComplete: () => {
            window.dispatchEvent(new Event('preloaderComplete'));
            
            gsap.to('#preloader-3d', {
                opacity: 0,
                duration: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    document.getElementById('preloader-3d').style.display = 'none';
                    setTimeout(cleanupPreloader, 2000);
                }
            });
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
    if (preloaderRenderer) {
        preloaderRenderer.dispose();
    }
    preloaderScene = null;
    preloaderCamera = null;
    preloaderRenderer = null;
    particles = null;
    window.removeEventListener('resize', onWindowResize);
}

initPreloader();

let isPortfolioLoaded = false;
let userClicked = false;

window.addEventListener('portfolioLoaded', () => {
    isPortfolioLoaded = true;
    
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
