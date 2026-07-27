/**
 * This file was generated with the assistance of AI.
 */
/**
 * scene.js – Game Scene (Side-scrolling runner)
 *
 * Flat ground. Jump over floor-level beer mugs, walk under
 * high ones. Floating musical notes drift across the screen.
 * Survive to the score threshold to win.
 */

import Player from './player.js';
import { Beer } from './obstacle.js';

/* ── Win threshold ~60 s at 60 fps ── */
const WIN_SCORE = 3600;

/* ── Note characters ── */
const NOTE_CHARS = ['♩', '♪', '♫', '♬', '𝄞', '𝄢'];

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

        this.banners = [];
        this._nextBannerId = 0;
    }

    /* ── Lifecycle ── */

    init(width, height) {
        this.width = width;
        this.height = height;
        this.groundY = height - 60;
        this.player = new Player(120, this.groundY, this.groundY);
        this.obstacles = [];
        this.notes = [];
        this.score = 0;
        this.gameOver = false;
        this.won = false;
        this.framesSinceLastSpawn = 0;
        this.framesSinceNote = 0;
        this.banners = [];
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
     * Records the start position and time for swipe detection.
     * A quick tap (no significant movement) triggers a jump.
     * @param {number} x  Touch X
     * @param {number} y  Touch Y
     */
    handleTouchStart(x, y) {
        if (this.gameOver) return;
        this._touchStartX = x;
        this._touchStartY = y;
        this._touchStartTime = performance.now();
        this._touchMoved = false;

        // Immediate jump on touch — the swipe-down duck check
        // happens on move/end so the player can react to obstacles.
        this._performJump();
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
     * Releases ducking if it was active.
     */
    handleTouchEnd() {
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

        // Banners
        this._updateBanners();
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
            flightOffset = 24 + Math.random() * 12; // 24–36 px above ground
        } else {
            // Above head → walk under safely
            flightOffset = 85 + Math.random() * 25;
        }
        this.obstacles.push(new Beer(this.width + 40, this.groundY, flightOffset));
    }

    /* ── Musical notes ── */

    _spawnNote() {
        const char = NOTE_CHARS[Math.floor(Math.random() * NOTE_CHARS.length)];
        this.notes.push({
            char,
            x: this.width + 20,
            y: 40 + Math.random() * (this.groundY - 80),
            size: 18 + Math.random() * 22,
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
            if (n.x + 30 < 0) this.notes.splice(i, 1);
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

    /* ── Scrolling banners ── */

    _getRandomPhrase() {
        const PHRASES = [
            { en: 'Keep going!',        de: 'Weiter so!',      es: '¡Sigue así!' },
            { en: 'You can do it!',     de: 'Du schaffst es!', es: '¡Tú puedes!' },
            { en: 'Almost there!',      de: 'Fast geschafft!', es: '¡Casi llegas!' },
            { en: 'Nice jump!',         de: 'Guter Sprung!',   es: '¡Buen salto!' },
            { en: 'Stay focused!',      de: 'Bleib dran!',     es: '¡Mantén el enfoque!' },
            { en: 'You rock!',          de: 'Du bist super!',  es: '¡Eres genial!' },
        ];
        return PHRASES[Math.floor(Math.random() * PHRASES.length)];
    }

    _spawnBanner() {
        const langs = ['en', 'de', 'es'];
        const phrase = this._getRandomPhrase();
        const lang = langs[Math.floor(Math.random() * langs.length)];
        const text = phrase[lang];
        this.banners.push({
            id: this._nextBannerId++,
            text,
            x: this.width + 50,
            y: 60 + Math.random() * 100,
            speed: 1.2 + Math.random() * 0.8,
        });
    }

    _updateBanners() {
        if (this.score % 200 === 0 && this.banners.length < 3) this._spawnBanner();
        if (this.banners.length === 0) this._spawnBanner();
        for (let i = this.banners.length - 1; i >= 0; i--) {
            const b = this.banners[i];
            b.x -= b.speed;
            if (b.x + b.text.length * 12 < -20) this.banners.splice(i, 1);
        }
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
        this._drawBanners(ctx);
        if (this.player) this.player.render(ctx);
    }

    /* ── Background ── */

    _drawBackground(ctx, W, H, GY) {
        // Dark sky
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        // Subtle sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(1, 90, 162, 0.06)');
        grad.addColorStop(0.5, 'rgba(238, 28, 37, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Ground
        ctx.fillStyle = '#015AA2';
        ctx.fillRect(0, GY, W, H - GY);

        // Ground top line
        ctx.strokeStyle = '#FFF200';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GY);
        ctx.lineTo(W, GY);
        ctx.stroke();

        // Ground stripes
        ctx.strokeStyle = '#FFF200';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.15;
        const offset = this.score % 30;
        for (let x = 0; x < W; x += 30) {
            const sx = x - offset;
            if (sx < 0) continue;
            ctx.beginPath();
            ctx.moveTo(sx, GY + 10);
            ctx.lineTo(sx + 10, GY + 10);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    /* ── Musical notes ── */

    _drawNotes(ctx) {
        ctx.save();
        for (const n of this.notes) {
            ctx.globalAlpha = n.opacity;
            ctx.fillStyle = '#FFF8E0';
            ctx.font = `${n.size}px "Segoe UI Symbol", "Arial Unicode MS", sans-serif`;
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

    /* ── Banners ── */

    _drawBanners(ctx) {
        ctx.save();
        for (const b of this.banners) {
            ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText(b.text, b.x + 2, b.y + 2);
            ctx.fillStyle = '#FFF8E0';
            ctx.fillText(b.text, b.x, b.y);
        }
        ctx.restore();
    }
}
