document.addEventListener('DOMContentLoaded', () => {
    try { sessionStorage.removeItem('portfolio_particles'); } catch(e) {}
    setupTopographicCanvas();
});

function setupTopographicCanvas() {
    const canvas = document.getElementById('ai-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    
    // Grid settings for Marching Squares
    // Reduced resolution from 25 to 12 prevents aliasing/fragmentation
    const res = 12; 
    let cols, rows;
    
    let mouse = { x: null, y: null };
    let scrollOffset = 0;
    let lastScrollY = window.scrollY;
    let time = 0;

    // Add a random global seed so the topographic map is extremely distinct every reload
    const globalSeed = Math.random() * 10000;

    class Hill {
        constructor(w, h) {
            this.w = w; 
            this.h = h;
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            // Lower height and smaller spread for distinct, separated hills
            this.height = 1.0 + Math.random() * 1.5;
            this.spread = (0.2 + Math.random() * 0.4) * w * h;
            if (this.spread < 150000) this.spread = 150000;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            const padding = 300;
            if (this.x < -padding || this.x > this.w + padding) this.vx *= -1;
            if (this.y < -padding || this.y > this.h + padding) this.vy *= -1;
        }
    }

    let hills = [];

    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        cols = Math.ceil(width / res) + 1;
        rows = Math.ceil(height / res) + 1;
        
        hills = [];
        // Create many more distinct regions (hills)
        const numHills = window.innerWidth > 768 ? 16 : 8;
        for (let i = 0; i < numHills; i++) {
            hills.push(new Hill(width, height));
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

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const deltaY = currentScrollY - lastScrollY;
        scrollOffset += deltaY * 1.2; // Parallax shift factor
        lastScrollY = currentScrollY;
    });

    // Marching squares edge lookup table for thresholds
    const ms_lines = [
        [], // 0
        [[2, 3]], // 1: BL
        [[1, 2]], // 2: BR
        [[1, 3]], // 3: BL, BR
        [[0, 1]], // 4: TR
        [[0, 3], [1, 2]], // 5: TR, BL (Saddle)
        [[0, 2]], // 6: TR, BR
        [[0, 3]], // 7: TR, BR, BL -> Out is TL
        [[0, 3]], // 8: TL
        [[0, 2]], // 9: TL, BL
        [[0, 1], [2, 3]], // 10: TL, BR (Saddle)
        [[0, 1]], // 11: TL, BL, BR -> Out is TR
        [[1, 3]], // 12: TL, TR
        [[1, 2]], // 13: TL, TR, BL -> Out is BR
        [[2, 3]], // 14: TL, TR, BR -> Out is BL
        [] // 15
    ];

    function getEdgePoint(col, row, edge, vTL, vTR, vBR, vBL) {
        let x, y;
        // The value `0` is our threshold boundary (Math.sin result)
        // Ensure denominator is never perfectly zero by adding 0.0001
        if (edge === 0) { // Top
            const f = (0 - vTL) / (vTR - vTL || 0.0001);
            x = (col + f) * res; y = row * res;
        } else if (edge === 1) { // Right
            const f = (0 - vTR) / (vBR - vTR || 0.0001);
            x = (col + 1) * res; y = (row + f) * res;
        } else if (edge === 2) { // Bottom
            const f = (0 - vBL) / (vBR - vBL || 0.0001);
            x = (col + f) * res; y = (row + 1) * res;
        } else { // Left
            const f = (0 - vTL) / (vBL - vTL || 0.0001);
            x = col * res; y = (row + f) * res;
        }
        return { x, y };
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        time += 0.015;

        for (let h of hills) h.update();

        // 1. Evaluate elevation scalar field into grid
        const grid = [];
        for (let c = 0; c < cols; c++) {
            grid[c] = [];
            for (let r = 0; r < rows; r++) {
                // Determine absolute coordinate
                const ax = c * res;
                // Add scrollOffset to shift the landscape vertically
                const ay = r * res + scrollOffset;
                
                // Domain warping: warp the coordinate space before sampling
                // This makes concentric circles twist into organic, geological shapes
                const warpStrength = 120;
                const warpX = ax + warpStrength * Math.sin(ay * 0.008 + time * 0.25 + globalSeed);
                const warpY = ay + warpStrength * Math.cos(ax * 0.009 - time * 0.18 + globalSeed * 0.7);
                
                // Second layer of warping for extra complexity
                const warpX2 = warpX + 60 * Math.sin(warpY * 0.012 - time * 0.1);
                const warpY2 = warpY + 60 * Math.cos(warpX * 0.011 + time * 0.15);

                let elevation = 0;
                for (let h of hills) {
                    const dx = warpX2 - h.x;
                    const dy = warpY2 - h.y;
                    const distSq = dx * dx + dy * dy;
                    elevation += h.height * Math.exp(-distSq / h.spread);
                }

                // Mouse acts as a moving valley
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = ax - mouse.x;
                    const dy = r * res - mouse.y; 
                    const distSq = dx * dx + dy * dy;
                    elevation -= 1.2 * Math.exp(-distSq / 250000);
                }
                
                // Add subtle global noise/tilt
                elevation += (ax * 0.00005) + Math.sin(ay * 0.0005) * 0.1;

                // Convert elevation to contour rings
                grid[c][r] = Math.sin(elevation * 4.5 - time + globalSeed);
            }
        }

        // 3. Style and Draw
        const isLightMode = document.body.classList.contains('light-mode');
        // Very faint, elegant colors (alpha reduced heavily)
        ctx.strokeStyle = isLightMode ? 'rgba(74, 93, 85, 0.15)' : 'rgba(200, 169, 106, 0.15)';
        ctx.lineWidth = 0.6; // Much thinner lines for premium look
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        for (let c = 0; c < cols - 1; c++) {
            for (let r = 0; r < rows - 1; r++) {
                // Adding tiny epsilon to avoid exact zero
                const vTL = grid[c][r] + 0.00001;
                const vTR = grid[c + 1][r] + 0.00001;
                const vBR = grid[c + 1][r + 1] + 0.00001;
                const vBL = grid[c][r + 1] + 0.00001;

                let state = 0;
                if (vTL > 0) state |= 8;
                if (vTR > 0) state |= 4;
                if (vBR > 0) state |= 2;
                if (vBL > 0) state |= 1;

                const lines = ms_lines[state];
                for (let i = 0; i < lines.length; i++) {
                    const edge1 = lines[i][0];
                    const edge2 = lines[i][1];

                    const p1 = getEdgePoint(c, r, edge1, vTL, vTR, vBR, vBL);
                    const p2 = getEdgePoint(c, r, edge2, vTL, vTR, vBR, vBL);
                    
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
            }
        }
        ctx.stroke();

        requestAnimationFrame(animate);
    }

    initCanvas();
    animate();

    window.addEventListener('resize', initCanvas);
}
