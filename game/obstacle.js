/**
 * obstacle.js – Obstacle Entities
 *
 * Beer mugs at two height levels: floor (jump over) or
 * above head (walk under).
 */

/* ── Beer (ground or flying) ── */

export class Beer {
    /**
     * @param {number} x            Centre X
     * @param {number} groundY      Ground Y
     * @param {number} flightOffset How high above ground the mug floats (0 = on ground)
     */
    constructor(x, groundY, flightOffset = 0) {
        this.type = 'beer';
        this.x = x;
        this.groundY = groundY;
        this.y = groundY - flightOffset;   // visual / collision centre
        this.flightOffset = flightOffset;
        this.glassW = 24;
        this.glassH = 34 + Math.floor(Math.random() * 8);
        this.foamH = 8 + Math.floor(Math.random() * 4);
        this.speed = 5;
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
        const cx = this.x;
        const bottom = this.y;
        const hw = this.glassW / 2;
        const bodyH = this.glassH;
        const foamH = this.foamH;
        const ti = 2;

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
        ctx.lineWidth = 1.5;
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
            const by = lt + 4 + Math.random() * (bodyH - foamH - 10);
            ctx.beginPath();
            ctx.arc(bx, by, 1.5 + Math.random() * 2, 0, Math.PI * 2);
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
            const wy = bottom - bodyH - foamH + Math.sin(i * 1.5 + this.x * 0.1) * 2;
            ctx.quadraticCurveTo(wx, wy, cx - hw + ti + (i + 1) * ww, bottom - bodyH);
        }
        ctx.lineTo(cx + hw - ti, bottom - bodyH + foamH);
        ctx.lineTo(cx - hw + ti, bottom - bodyH + foamH);
        ctx.closePath();
        ctx.fill();

        // Handle
        ctx.strokeStyle = 'rgba(200, 180, 140, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx + hw - 2, bottom - bodyH * 0.6, 8, -0.6, 0.6, false);
        ctx.stroke();
    }
}


