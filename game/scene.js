/**
 * This file was generated with the assistance of AI.
 */
/**
 * scene.js – Game Scene (Side-scrolling runner)
 *
 * Flat ground. Avoid the neon blocks (jump over floor blocks, duck
 * under head-height blocks). Collect the beer mugs that spawn
 * occasionally – collect WIN_BEERS to win.
 */

import Player from './player.js';
import { Block, Beer } from './obstacle.js';

/* ── Win condition: collect this many beers ── */
export const WIN_BEERS = 10;

/* ── Global size scale (1.5 = everything 50% bigger) ── */
const SCALE = 1.5;

/* ── Base drive speed of blocks & beers (px/frame) at game start ── */
const BASE_SPEED = 5 * SCALE;

/* ── Spawn-safety zone: no new entity spawns while another entity is
 *    within this many px of the right edge (prevents overlap). Must be
 *    smaller than the tightest block spacing so the zone always clears. ── */
const SPAWN_GUARD = 140;

/* ── Background sign (stacked rows) ── */
const SIGN_LINES = ['Beer', 'Olympics', '2026'];
const SIGN_ALPHA = 0.3;
// Distinct height per row (multiplier on top of the width-filling size)
const SIGN_ROW_HEIGHTS = [1.0, 0.85, 0.68];

export default class Scene {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = 0;
        this.height = 0;
        this.groundY = 0;
        this.player = null;
        this.obstacles = [];
        this.beers = [];
        this.score = 0;
        this.beersCollected = 0;
        this.gameOver = false;
        this.won = false;
        this.framesSinceLastSpawn = 0;
        this.framesSinceBeer = 0;
        this._animationId = null;
        this._signCache = null;

        this._onWin = null;
        this._onLose = null;
        this._onScore = null;
        this._onJump = null;
        this._onCollect = null;
    }

    /* ── Lifecycle ── */

    init(width, height) {
        this.width = width;
        this.height = height;
        this.groundY = height - 60 * SCALE;
        this.player = new Player(120 * SCALE, this.groundY, this.groundY, SCALE, BASE_SPEED);
        this.obstacles = [];
        this.beers = [];
        this.score = 0;
        this.beersCollected = 0;
        this.gameOver = false;
        this.won = false;
        this.framesSinceLastSpawn = 0;
        this.framesSinceBeer = 0;
        this._signCache = null; // rebuilt on resize – the background sign layout depends on W/H
    }

    setCallbacks(onWin, onLose, onScore, onJump, onCollect) {
        this._onWin = onWin;
        this._onLose = onLose;
        this._onScore = onScore;
        this._onJump = onJump;
        this._onCollect = onCollect;
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
        const progress = Math.min(this.score / 1800, 1); // difficulty ramps over ~30 s
        // Constant speed: the game runs at the same fast speed from the
        // very beginning – no acceleration ramp.
        const speedFactor = 1.45;

        // Player (gravity scales with speed so jumps land faster)
        this.player.update(this.groundY, speedFactor);

        // Score
        this.score += 1;
        if (this._onScore) this._onScore(this.score);

        // Spawn blocks – every ~0.83 s early, tightening to ~0.4 s at
        // full difficulty (kept loose enough that the spawn-safety zone
        // always clears and beers can keep spawning).
        this.framesSinceLastSpawn += 1;
        const spawnRate = Math.max(24, 50 - progress * 22);
        if (this.framesSinceLastSpawn >= spawnRate && !this.gameOver) {
            this.framesSinceLastSpawn = 0;
            this._spawnBlock(speedFactor);
        }

        // Move obstacles
        this.obstacles.forEach((o) => o.update());
        this.obstacles = this.obstacles.filter((o) => !o.isOffScreen());

        // Spawn beer collectibles at a constant rate – equal distance
        // between consecutive beers (constant speed × fixed interval).
        this.framesSinceBeer += 1;
        const beerRate = 120; // every ~2 s at 60 fps
        if (this.framesSinceBeer >= beerRate && this.beers.length < 2) {
            // Only restart the wait when a beer was actually spawned. If the
            // spawn line is briefly blocked, retry next frame instead of
            // waiting another full interval – keeps the gap short.
            if (this._spawnBeer(speedFactor)) this.framesSinceBeer = 0;
        }

        // Move beers
        this.beers.forEach((b) => b.update());
        this.beers = this.beers.filter((b) => !b.isOffScreen());
    }

    /* ── Block spawning ── */

    _spawnBlock(speedFactor = 1) {
        // Avoid spawning a block on top of a beer that is still near the
        // right edge – keeps collectibles and obstacles apart.
        if (this.beers.some((e) => e.x > this.width - SPAWN_GUARD)) return;

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
        this.obstacles.push(new Block(
            this.width + 40 * SCALE,
            this.groundY,
            flightOffset,
            SCALE,
            BASE_SPEED * speedFactor
        ));
    }

    /* ── Beer (collectible) spawning ── */

    _spawnBeer(speedFactor = 1) {
        const spawnX = this.width + 40 * SCALE;

        // Avoid spawning a beer on top of a block or another beer that is
        // still near the right edge – keeps collectibles and obstacles apart.
        const nearEdge = (e) => e.x > this.width - SPAWN_GUARD;
        if (this.obstacles.some(nearEdge) || this.beers.some(nearEdge)) return false;

        // Mix: ground-level (collect by running) and jump-level
        // (reachable with a jump – player jumps ~110 px high)
        let flightOffset;
        if (Math.random() < 0.55) {
            flightOffset = 0;                                   // on the ground
        } else {
            flightOffset = (30 + Math.random() * 40) * SCALE;   // requires a jump
        }
        this.beers.push(new Beer(spawnX, this.groundY, flightOffset, SCALE, BASE_SPEED * speedFactor));
        return true;
    }

    /* ── Collision ── */

    _checkCollisions() {
        if (!this.player || this.gameOver) return;
        const pb = this.player.getBounds();

        // Blocks kill
        for (const obs of this.obstacles) {
            if (obs.type === 'block' && this._rectsOverlap(pb, obs.getBounds())) {
                this._lose();
                return;
            }
        }

        // Beers are collected on contact
        for (let i = this.beers.length - 1; i >= 0; i--) {
            const b = this.beers[i];
            if (this._rectsOverlap(pb, b.getBounds())) {
                this.beers.splice(i, 1);
                this.beersCollected += 1;
                if (this._onCollect) this._onCollect(this.beersCollected, WIN_BEERS);
            }
        }
    }

    _checkWinLose() {
        // Win by collecting WIN_BEERS beers
        if (this.beersCollected >= WIN_BEERS && !this.won) {
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
        this._drawObstacles(ctx);
        this._drawBeers(ctx);
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

    /* ── Huge background sign ──
     *
     * Pre-rendered layers: the static part (outline strokes + dim fill) and
     * one glow sprite per word are drawn ONCE into offscreen canvases when
     * the canvas is (re)created. Per frame we only blit them, which avoids
     * the expensive per-frame text measuring, stroking and shadowBlur passes
     * on very large text.
     */

    _ensureSignCache() {
        const W = this.width;
        const H = this.height;
        const cache = this._signCache;
        if (cache && cache.w === W && cache.h === H) return;

        const lines = SIGN_LINES;
        const rowHeights = SIGN_ROW_HEIGHTS;
        const gapFactor = 0.9;

        // Probe context for measuring (no shadow/alpha needed for widths)
        const probe = document.createElement('canvas').getContext('2d');

        // 1. Natural font size per row so each line spans the complete width,
        //    scaled by its row height multiplier so the rows differ in height.
        const refSize = 100;
        const maxW = W * 0.98;
        probe.font = `900 ${refSize}px "Segoe UI", system-ui, sans-serif`;
        const sizes = lines.map((line, i) => {
            const tw = Math.max(1, probe.measureText(line).width);
            return ((refSize * maxW) / tw) * rowHeights[i];
        });

        // 2. Scale the whole stack down (if needed) so it is fully visible
        //    inside the viewport. Rows overlap slightly → almost no space.
        const totalRatio = sizes.reduce((sum, sz) => sum + sz * gapFactor, 0);
        const k = Math.min(1, (H * 0.98) / totalRatio);

        // Word center Y positions (same layout math as the original draw loop)
        const ys = [];
        let y = (H - totalRatio * k) / 2 + (sizes[0] * k * gapFactor) / 2;
        for (let i = 0; i < lines.length; i++) {
            ys.push(y);
            if (i + 1 < lines.length) {
                y += ((sizes[i] + sizes[i + 1]) * k * gapFactor) / 2;
            }
        }

        /* ── Layer 1: static base (strokes + dim fill) ── */
        const base = document.createElement('canvas');
        base.width = W;
        base.height = H;
        const bctx = base.getContext('2d');
        bctx.globalAlpha = SIGN_ALPHA;
        bctx.fillStyle = '#FFD400';
        bctx.textAlign = 'center';
        bctx.textBaseline = 'middle';
        bctx.lineJoin = 'round';
        for (let i = 0; i < lines.length; i++) {
            const size = sizes[i] * k;
            bctx.font = `900 ${size}px "Segoe UI", system-ui, sans-serif`;
            const tw = Math.max(1, bctx.measureText(lines[i]).width);
            const stretch = maxW / tw;
            bctx.save();
            bctx.translate(W / 2, ys[i]);
            bctx.scale(stretch, 1);

            // Thicker multi-pass outline: dark "cutout" ring + warm halo
            // makes the giant text legible and gives it a modern neon feel.
            bctx.strokeStyle = 'rgba(15, 15, 26, 0.9)';
            bctx.lineWidth = size / 12;
            bctx.strokeText(lines[i], 0, 0);
            bctx.strokeStyle = 'rgba(255, 105, 0, 0.35)';
            bctx.lineWidth = size / 22;
            bctx.strokeText(lines[i], 0, 0);

            // Always-visible dim fill (the cycling glow is added per frame)
            bctx.fillText(lines[i], 0, 0);
            bctx.restore();
        }

        /* ── Layer 2: per-word glow sprites (fill + halo at max intensity) ── */
        const glowSprites = [];
        const margin = 48; // halo bleed room around the glyphs
        for (let i = 0; i < lines.length; i++) {
            const size = sizes[i] * k;
            probe.font = `900 ${size}px "Segoe UI", system-ui, sans-serif`;
            const tw = Math.max(1, probe.measureText(lines[i]).width);
            const stretch = maxW / tw;
            const sw = Math.ceil(maxW) + margin * 2;
            const sh = Math.ceil(size * 1.5) + margin * 2;
            const sprite = document.createElement('canvas');
            sprite.width = sw;
            sprite.height = sh;
            const sctx = sprite.getContext('2d');
            sctx.font = `900 ${size}px "Segoe UI", system-ui, sans-serif`;
            sctx.textAlign = 'center';
            sctx.textBaseline = 'middle';
            sctx.shadowColor = 'rgba(255, 242, 0, 0.95)';
            sctx.shadowBlur = 36; // baked at max intensity; alpha modulates per frame
            sctx.fillStyle = '#FFD400';
            sctx.save();
            sctx.translate(sw / 2, sh / 2);
            sctx.scale(stretch, 1);
            sctx.fillText(lines[i], 0, 0);
            sctx.restore();
            glowSprites.push({
                img: sprite,
                dx: Math.round(W / 2 - sw / 2),
                dy: Math.round(ys[i] - sh / 2)
            });
        }

        this._signCache = { w: W, h: H, base, glowSprites };
    }

    _drawSign(ctx, W, H) {
        this._ensureSignCache();
        const cache = this._signCache;
        if (!cache) return;

        // Static base: strokes + dim fill (single cheap blit)
        ctx.drawImage(cache.base, 0, 0);

        // Sequential glow cycle: each word lights up in turn
        // ("Beer" → "Olympics" → "2026" → repeat).
        const lines = SIGN_LINES;
        const t = performance.now();
        const cycleMs = 4200;                            // 1.4 s per word
        const slot = 1 / lines.length;                   // each word owns 1/n of the cycle
        const phase = (t % cycleMs) / cycleMs;           // 0..1 over the full cycle
        const glowOf = (i) => {
            const pos = (phase - i * slot + 1) % 1;      // 0 when word i starts its pulse
            return Math.pow(0.5 * (1 - Math.cos(pos * Math.PI * 2)), 1.5);
        };

        // Additive glow pass: blit each word's pre-rendered glow sprite,
        // scaled by its current glow intensity (no per-frame shadowBlur).
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < lines.length; i++) {
            const g = glowOf(i);
            if (g < 0.01) continue;
            const s = cache.glowSprites[i];
            ctx.globalAlpha = 0.5 * g;
            ctx.drawImage(s.img, s.dx, s.dy);
        }
        ctx.restore();
    }

    /* ── Obstacles ── */

    _drawObstacles(ctx) {
        for (const obs of this.obstacles) {
            obs.render(ctx);
        }
    }

    /* ── Beers (collectibles) ── */

    _drawBeers(ctx) {
        for (const b of this.beers) {
            b.render(ctx);
        }
    }
}
