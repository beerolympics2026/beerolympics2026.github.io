/**
 * This file was generated with the assistance of AI.
 */
/**
 * scene.js – Game Scene (Side-scrolling runner)
 *
 * Flat ground. Jump over floor-level beer mugs, walk under
 * high ones. Floating musical notes and shopping glyphs drift across
 * the screen. Survive to the score threshold to win.
 */

import Player from './player.js';
import { Beer } from './obstacle.js';

/* ── Win threshold ~60 s at 60 fps ── */
const WIN_SCORE = 3600;

/* ── Global size scale (1.5 = everything 50% bigger) ── */
const SCALE = 1.5;

/* ── Floating glyphs: music notes + shopping / discounter symbols ── */
const NOTE_CHARS = ['♩', '♪', '♫', '♬', '𝄞', '𝄢', '🛒', '🏷', '€', '$', '%', '🍺'];

/* ── Background sign (stacked rows) ── */
const SIGN_LINES = ['Beer', 'Olympics', '2026'];
const SIGN_ALPHA = 0.14;

export default class Scene {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = 0;
        this.height = 0;
        this.groundY = 0;
        this.player = null;
        this.obstacles = [];
        this.notes = [];
        this.score = 0;
        this.gameOver = false;
        this.won = false;
        this.framesSinceLastSpawn = 0;
        this.framesSinceNote = 0;
        this._animationId = null;

        this._onWin = null;
        this._onLose = null;
        this._onScore = null;
        this._onJump = null;
    }

    /* ── Lifecycle ── */

    init(width, height) {
        this.width = width;
        this.height = height;
        this.groundY = height - 60 * SCALE;
        this.player = new Player(120 * SCALE, this.groundY, this.groundY, SCALE);
        this.obstacles = [];
        this.notes = [];
        this.score = 0;
        this.gameOver = false;
        this.won = false;
        this.framesSinceLastSpawn = 0;
        this.framesSinceNote = 0;
    }

    setCallbacks(onWin, onLose, onScore, onJump) {
        this._onWin = onWin;
        this._onLose = onLose;
        this._onScore = onScore;
        this._onJump = onJump;
    }

    start() {
        this._lastTime = performance.now();
        this._loop(this._lastTime);
    }

    stop() {
        if (this._animationId !== null) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
    }

    /* ── Keyboard ──
     *  Space/Up  → jump
     *  Down      → duck (while held)
     */

    handleKeyDown(e) {
        if (this.gameOver) return;
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            this._performJump();
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            if (this.player) this.player.setDucking(true);
        }
    }

    handleKeyUp(e) {
        if (e.code === 'ArrowDown') {
            if (this.player) this.player.setDucking(false);
        }
    }

    /* ── Touch Input ──
     *  Tap            → jump
     *  Swipe down     → duck (while finger held)
     *
     *  The game canvas registers touch events and forwards them here.
     */

    /**
     * Called on touchstart.
     * Records the start position; jump is deferred to touchend
     * so swipe-down to duck is not preceded by an unwanted jump.
     * @param {number} x  Touch X
     * @param {number} y  Touch Y
     */
    handleTouchStart(x, y) {
        if (this.gameOver) return;
        this._touchStartX = x;
        this._touchStartY = y;
        this._touchStartTime = performance.now();
        this._touchMoved = false;
    }

    /**
     * Called on touchmove.
     * If the finger moves significantly downward, switch to ducking.
     * @param {number} x  Touch X
     * @param {number} y  Touch Y
     */
    handleTouchMove(x, y) {
        if (this.gameOver) return;
        const dx = x - (this._touchStartX || 0);
        const dy = y - (this._touchStartY || 0);

        // If the user swipes downward, engage ducking
        if (dy > 20 && Math.abs(dy) > Math.abs(dx)) {
            this._touchMoved = true;
            if (this.player) this.player.setDucking(true);
        }
    }

    /**
     * Called on touchend.
     * If the finger did not move significantly (a tap), jump.
     * Always release ducking.
     */
    handleTouchEnd() {
        if (this.gameOver) {
            if (this.player) this.player.setDucking(false);
            return;
        }

        // No significant movement → treat as a tap → jump
        if (!this._touchMoved) {
            this._performJump();
        }

        // Release ducking
        if (this.player && this.player.isDucking) {
            this.player.setDucking(false);
        }
        this._touchMoved = false;
    }

    /** @private Shared jump logic for keyboard and touch. */
    _performJump() {
        if (this.gameOver) return;
        if (this.player && this.player.isOnGround && this._onJump) {
            this._onJump();
        }
        if (this.player) this.player.jump();
    }

    /* ── Main loop ── */

    _loop(now) {
        if (!this.gameOver) {
            this._update();
            this._checkCollisions();
            this._checkWinLose();
        }
        this._render();
        this._animationId = requestAnimationFrame((t) => this._loop(t));
    }

    /* ── Update ── */

    _update() {
        const progress = Math.min(this.score / WIN_SCORE, 1);

        // Player
        this.player.update(this.groundY);

        // Score
        this.score += 1;
        if (this._onScore) this._onScore(this.score);

        // Spawn beer mugs
        this.framesSinceLastSpawn += 1;
        const spawnRate = Math.max(25, 55 - progress * 20);
        if (this.framesSinceLastSpawn >= spawnRate && !this.gameOver) {
            this.framesSinceLastSpawn = 0;
            this._spawnBeer();
        }

        // Move obstacles
        this.obstacles.forEach((o) => o.update());
        this.obstacles = this.obstacles.filter((o) => !o.isOffScreen());

        // Spawn musical notes
        this.framesSinceNote += 1;
        if (this.framesSinceNote >= 30 + Math.floor(Math.random() * 40)) {
            this.framesSinceNote = 0;
            this._spawnNote();
        }

        // Move notes
        this._updateNotes();
    }

    /* ── Beer spawning ── */

    _spawnBeer() {
        // Three levels: 50% floor, 30% duck height, 20% safe above
        const roll = Math.random();
        let flightOffset;
        if (roll < 0.5) {
            // Floor → jump over
            flightOffset = 0;
        } else if (roll < 0.8) {
            // Head height → duck under (player 38px standing, 20px ducking)
            flightOffset = (24 + Math.random() * 12) * SCALE; // 24–36 px above ground
        } else {
            // Above head → walk under safely
            flightOffset = (85 + Math.random() * 25) * SCALE;
        }
        this.obstacles.push(new Beer(this.width + 40 * SCALE, this.groundY, flightOffset, SCALE));
    }

    /* ── Musical notes ── */

    _spawnNote() {
        const char = NOTE_CHARS[Math.floor(Math.random() * NOTE_CHARS.length)];
        const NOTE_COLORS = ['#FFD400', '#FF6900', '#FFF8E0'];
        this.notes.push({
            char,
            color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
            x: this.width + 20 * SCALE,
            y: 40 * SCALE + Math.random() * (this.groundY - 80 * SCALE),
            size: (18 + Math.random() * 22) * SCALE,
            speed: 1 + Math.random() * 0.8,
            phase: Math.random() * Math.PI * 2,
            amplitude: 5 + Math.random() * 12,
            frequency: 0.02 + Math.random() * 0.03,
            opacity: 0.15 + Math.random() * 0.25,
        });
    }

    _updateNotes() {
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const n = this.notes[i];
            n.x -= n.speed;
            n.y += Math.sin(this.score * n.frequency + n.phase) * 0.4;
            if (n.x + n.size < 0) this.notes.splice(i, 1);
        }
    }

    /* ── Collision ── */

    _checkCollisions() {
        if (!this.player || this.gameOver) return;
        const pb = this.player.getBounds();

        for (const obs of this.obstacles) {
            if (obs.type === 'beer') {
                if (this._rectsOverlap(pb, obs.getBounds())) {
                    this._lose();
                    return;
                }
            }
        }
    }

    _checkWinLose() {
        // Win by reaching score threshold
        if (this.score >= WIN_SCORE && !this.won) {
            this._win();
            return;
        }
        // Lose by falling off screen bottom
        if (this.player && this.player.y > this.height + 50) {
            this._lose();
        }
    }

    _win() {
        this.gameOver = true;
        this.won = true;
        if (this._onWin) this._onWin();
    }

    _lose() {
        this.gameOver = true;
        this.won = false;
        if (this._onLose) this._onLose();
    }

    _rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    /* ═══════════════════════════════════════════════
       RENDERING
       ═══════════════════════════════════════════════ */

    _render() {
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;
        const GY = this.groundY;

        ctx.clearRect(0, 0, W, H);

        this._drawBackground(ctx, W, H, GY);
        this._drawNotes(ctx);
        this._drawObstacles(ctx);
        if (this.player) this.player.render(ctx);
    }

    /* ── Background ── */

    _drawBackground(ctx, W, H, GY) {
        // Dark sky
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        // Huge background sign (behind everything, slightly transparent)
        this._drawSign(ctx, W, H);

        // Subtle sky gradient (faint theme tint, no bright orange)
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(255, 212, 0, 0.05)');
        grad.addColorStop(0.5, 'rgba(255, 212, 0, 0.02)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Horizon glow above the ground line (subtle theme light)
        const glow = ctx.createLinearGradient(0, GY - 120, 0, GY);
        glow.addColorStop(0, 'rgba(255, 212, 0, 0)');
        glow.addColorStop(1, 'rgba(255, 212, 0, 0.07)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, GY - 120, W, 120);

        // Ground: dark slate surface (matches the site theme, no bright orange)
        const groundGrad = ctx.createLinearGradient(0, GY, 0, H);
        groundGrad.addColorStop(0, '#23233C');
        groundGrad.addColorStop(1, '#12121F');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, GY, W, H - GY);

        // Glowing ground top line (neon theme accent)
        ctx.save();
        ctx.shadowColor = 'rgba(255, 212, 0, 0.75)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#FFD400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GY);
        ctx.lineTo(W, GY);
        ctx.stroke();
        ctx.restore();

        // Subtle scrolling lane dashes on the ground
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        const offset = this.score % 30;
        for (let x = 0; x < W; x += 30) {
            const sx = x - offset;
            if (sx < 0) continue;
            ctx.beginPath();
            ctx.moveTo(sx, GY + 10);
            ctx.lineTo(sx + 10, GY + 10);
            ctx.stroke();
        }
    }

    /* ── Huge background sign ── */

    _drawSign(ctx, W, H) {
        const lines = SIGN_LINES;

        // Give every row its own font size so each line spans the complete width
        const refSize = 100;
        const maxW = W * 0.99;
        ctx.font = `900 ${refSize}px "Segoe UI", system-ui, sans-serif`;
        const sizes = lines.map((line) => {
            const tw = ctx.measureText(line).width;
            return (refSize * maxW) / Math.max(1, tw);
        });

        // Stack the rows, centered vertically as a block.
        // Each row individually fills the width; on screens where the stack
        // is taller than the viewport the outer rows bleed off the edges.
        const lineHFactor = 1.0;
        const lineHs = sizes.map((sz) => sz * lineHFactor);
        let totalH = 0;
        for (let i = 0; i < lineHs.length; i++) {
            totalH += (i === 0 || i === lineHs.length - 1) ? lineHs[i] / 2 : lineHs[i];
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = SIGN_ALPHA;
        ctx.fillStyle = '#FFD400';

        let y = (H - totalH) / 2 + lineHs[0] / 2;
        for (let i = 0; i < lines.length; i++) {
            ctx.font = `900 ${sizes[i]}px "Segoe UI", system-ui, sans-serif`;
            ctx.fillText(lines[i], W / 2, y);
            if (i + 1 < lines.length) y += (lineHs[i] + lineHs[i + 1]) / 2;
        }

        ctx.globalAlpha = 1;
    }

    /* ── Musical notes ── */

    _drawNotes(ctx) {
        ctx.save();
        for (const n of this.notes) {
            ctx.globalAlpha = n.opacity;
            ctx.fillStyle = n.color;
            ctx.font = `${n.size}px "Segoe UI Emoji", "Segoe UI Symbol", "Arial Unicode MS", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.char, n.x, n.y);
        }
        ctx.restore();
    }

    /* ── Obstacles ── */

    _drawObstacles(ctx) {
        for (const obs of this.obstacles) {
            obs.render(ctx);
        }
    }
}
