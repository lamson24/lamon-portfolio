document.addEventListener('DOMContentLoaded', () => {
    try { sessionStorage.removeItem('portfolio_particles'); } catch(e) {}
    setupMagicalCanvas();
});

function setupMagicalCanvas() {
    const canvas = document.getElementById('ai-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null };

    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        createParticles();
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Particles drift gently, some move faster
            const speedMult = Math.random() > 0.9 ? 1.5 : 0.4;
            this.vx = (Math.random() - 0.5) * speedMult;
            this.vy = (Math.random() - 0.5) * speedMult - 0.3; // slight upward drift
            
            // Size variation: some are tiny dust, some are larger bokeh spots
            this.radius = Math.random() > 0.8 ? Math.random() * 3 + 1.5 : Math.random() * 1.5 + 0.5;
            this.baseAlpha = Math.random() * 0.6 + 0.1;
            
            // 85% golden sparks, 15% magical blue sparks
            const isBlue = Math.random() > 0.85;
            if (document.body.classList.contains('light-mode')) {
                this.color = isBlue ? '120, 160, 210' : '220, 160, 60';
            } else {
                this.color = isBlue ? '180, 230, 255' : '255, 215, 120';
            }
            
            this.angle = Math.random() * Math.PI * 2;
            this.spin = (Math.random() - 0.5) * 0.02;
            
            // Determine if this particle is 'out of focus' (bokeh effect)
            this.blur = Math.random() > 0.7 ? Math.random() * 4 + 2 : 0;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.angle += this.spin;

            // subtle organic swirling motion
            this.x += Math.sin(this.angle) * 0.2;
            this.y += Math.cos(this.angle) * 0.2;

            // mouse interaction: gently push away
            if (mouse.x !== null && mouse.y !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 40000) { // 200px radius
                    const force = (40000 - distSq) / 40000;
                    this.vx += (dx / Math.sqrt(distSq)) * force * 0.02;
                    this.vy += (dy / Math.sqrt(distSq)) * force * 0.02;
                }
            }

            // wrap around edges smoothly
            if (this.x < -50) this.x = width + 50;
            if (this.x > width + 50) this.x = -50;
            if (this.y < -50) this.y = height + 50;
            if (this.y > height + 50) this.y = -50;

            // natural friction
            this.vx *= 0.995;
            this.vy *= 0.995;
            
            // restore base upward draft slowly
            if (this.vy > -0.3) {
                this.vy -= 0.002;
            }
        }

        draw(ctx, time) {
            // twinkle effect using sine wave over time and position
            const twinkle = 0.5 + 0.5 * Math.sin(time * 0.002 + this.x * 0.05);
            const currentAlpha = this.baseAlpha * twinkle;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = \gba(\, \)\;
            
            if (this.blur > 0) {
                ctx.shadowBlur = this.blur;
                ctx.shadowColor = \gba(\, \)\;
            } else {
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        // More particles on larger screens, capped at 300
        const numParticles = Math.min(Math.floor(window.innerWidth / 4), 300);
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }
    }

    document.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    document.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    let time = 0;
    function animate() {
        ctx.clearRect(0, 0, width, height);
        time += 16; 

        // Set global composite operation for magical glow blending
        ctx.globalCompositeOperation = 'screen';

        for (let p of particles) {
            p.update();
            p.draw(ctx, time);
        }
        
        ctx.globalCompositeOperation = 'source-over'; // reset
        ctx.shadowBlur = 0; // reset

        requestAnimationFrame(animate);
    }

    initCanvas();
    animate();

    window.addEventListener('resize', () => {
        // Debounce resize
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(initCanvas, 200);
    });
}

