/**
 * This file was generated with the assistance of AI.
 */
/**
 * obstacle.js – Obstacle & Collectible Entities
 *
 * Blocks: obstacles to avoid (jump over floor blocks, duck under
 * head-height blocks).
 * Beers: collectibles that spawn occasionally. Collect WIN_BEERS
 * to win the game.
 */

/* ── Block (ground or flying obstacle) ── */

/* Block colors – picked randomly per block from the site theme palette */
const BLOCK_COLORS = ['#FF6900', '#FFD400', '#EE1C25', '#015AA2', '#9B51E0', '#2BC4B4'];

export class Block {
    /**
     * @param {number} x            Centre X
     * @param {number} groundY      Ground Y
     * @param {number} flightOffset How high above ground the block floats (0 = on ground)
     * @param {number} scale        Size multiplier (default 1)
     * @param {number} [speed]      Movement speed in px/frame (default 5 * scale)
     */
    constructor(x, groundY, flightOffset = 0, scale = 1, speed = null) {
        this.type = 'block';
        this.scale = scale;
        this.x = x;
        this.groundY = groundY;
        this.y = groundY - flightOffset;   // visual / collision bottom
        this.flightOffset = flightOffset;
        this.width = 26 * scale;
        this.height = (30 + Math.floor(Math.random() * 10)) * scale;
        this.speed = speed || 4 * scale;
        this.color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
        this.passed = false;
    }

    update() { this.x -= this.speed; }

    isOffScreen() { return this.x + this.width < 0; }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height,
            w: this.width,
            h: this.height,
        };
    }

    render(ctx) {
        const cx = this.x;
        const bottom = this.y;
        const hw = this.width / 2;
        const h = this.height;

        // Colored body (no glow)
        ctx.fillStyle = this.color;
        ctx.fillRect(cx - hw, bottom - h, this.width, h);

        // Subtle depth: light on top, dark at the bottom
        const grad = ctx.createLinearGradient(0, bottom - h, 0, bottom);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - hw, bottom - h, this.width, h);

        // Thin darker outline for contrast
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - hw, bottom - h, this.width, h);
    }
}

/* ── Beer (collectible) ── */

export class Beer {
    /**
     * @param {number} x            Centre X
     * @param {number} groundY      Ground Y
     * @param {number} flightOffset How high above ground the mug floats (0 = on ground)
     * @param {number} scale        Size multiplier (default 1)
     * @param {number} [speed]      Movement speed in px/frame (default 5 * scale)
     */
    constructor(x, groundY, flightOffset = 0, scale = 1, speed = null) {
        this.type = 'beer';
        this.scale = scale;
        this.x = x;
        this.groundY = groundY;
        this.y = groundY - flightOffset;   // visual / collision bottom
        this.flightOffset = flightOffset;
        this.glassW = 24 * scale;
        this.glassH = (30 + Math.floor(Math.random() * 6)) * scale;
        this.foamH = (8 + Math.floor(Math.random() * 4)) * scale;
        this.speed = speed || 4 * scale;
        this.beerShade = `hsl(42, ${75 + Math.random() * 15}%, ${55 + Math.random() * 15}%)`;
        this.passed = false;
    }

    update() { this.x -= this.speed; }

    isOffScreen() { return this.x + this.glassW < 0; }

    getBounds() {
        return {
            x: this.x - this.glassW / 2,
            y: this.y - this.glassH - this.foamH,
            w: this.glassW,
            h: this.glassH + this.foamH,
        };
    }

    render(ctx) {
        const s = this.scale || 1;
        const cx = this.x;
        const bottom = this.y;
        const hw = this.glassW / 2;
        const bodyH = this.glassH;
        const foamH = this.foamH;
        const ti = 2 * s;

        // Soft glow so collectibles stand out against the dark background
        ctx.save();
        ctx.shadowColor = 'rgba(255, 212, 0, 0.6)';
        ctx.shadowBlur = 16;

        // Glass
        ctx.fillStyle = 'rgba(255, 220, 150, 0.3)';
        ctx.beginPath();
        ctx.moveTo(cx - hw + ti, bottom - bodyH);
        ctx.lineTo(cx + hw - ti, bottom - bodyH);
        ctx.lineTo(cx + hw, bottom);
        ctx.lineTo(cx - hw, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 180, 140, 0.6)';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Liquid
        const lt = bottom - bodyH + foamH;
        ctx.fillStyle = this.beerShade;
        ctx.beginPath();
        ctx.moveTo(cx - hw + ti + 1, lt);
        ctx.lineTo(cx + hw - ti - 1, lt);
        ctx.lineTo(cx + hw - 1, bottom - 1);
        ctx.lineTo(cx - hw + 1, bottom - 1);
        ctx.closePath();
        ctx.fill();

        // Bubbles
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        for (let i = 0; i < 4; i++) {
            const bx = cx - hw * 0.4 + Math.random() * hw * 0.8;
            const by = lt + 4 * s + Math.random() * (bodyH - foamH - 10 * s);
            ctx.beginPath();
            ctx.arc(bx, by, (1.5 + Math.random() * 2) * s, 0, Math.PI * 2);
            ctx.fill();
        }

        // Foam
        ctx.fillStyle = '#f5f0e0';
        ctx.beginPath();
        const wc = 4;
        const ww = (this.glassW - ti * 2) / wc;
        ctx.moveTo(cx - hw + ti, bottom - bodyH);
        for (let i = 0; i < wc; i++) {
            const wx = cx - hw + ti + i * ww + ww / 2;
            const wy = bottom - bodyH - foamH + Math.sin(i * 1.5 + this.x * 0.1) * 2 * s;
            ctx.quadraticCurveTo(wx, wy, cx - hw + ti + (i + 1) * ww, bottom - bodyH);
        }
        ctx.lineTo(cx + hw - ti, bottom - bodyH + foamH);
        ctx.lineTo(cx - hw + ti, bottom - bodyH + foamH);
        ctx.closePath();
        ctx.fill();

        // Handle
        ctx.strokeStyle = 'rgba(200, 180, 140, 0.5)';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(cx + hw - 2 * s, bottom - bodyH * 0.6, 8 * s, -0.6, 0.6, false);
        ctx.stroke();

        ctx.restore();
    }
}
