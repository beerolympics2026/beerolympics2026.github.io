/**
 * This file was generated with the assistance of AI.
 */
/**
 * player.js – Player Entity (Side-scrolling runner)
 *
 * Fixed horizontal position. Can jump over floor mugs and
 * duck under head-height mugs.
 */

export default class Player {
    /**
     * @param {number} x       Fixed screen X (centre of player)
     * @param {number} y       Starting Y (bottom / feet)
     * @param {number} groundY Current ground Y
     */
    constructor(x, y, groundY) {
        this.fixedX = x;
        this.x = x;
        this.y = y;
        this.groundY = groundY;

        this.width = 28;
        this.height = 38;
        this.duckHeight = 20;           // hitbox when ducking
        this.vy = 0;
        this.gravity = 0.55;
        this.jumpPower = -11;
        this.isOnGround = false;

        // Duck
        this.isDucking = false;

        this.runFrame = 0;
        this.runTimer = 0;
    }

    /** Effective hitbox height (shorter when ducking). */
    get effectiveHeight() {
        return this.isDucking ? this.duckHeight : this.height;
    }

    /** Apply jump. */
    jump() {
        if (!this.isOnGround) return;
        this.vy = this.jumpPower;
        this.isOnGround = false;
    }

    /** Set ducking state. */
    setDucking(ducking) {
        this.isDucking = ducking;
    }

    /**
     * Advance one frame.
     * @param {number} groundY  Current ground level
     */
    update(groundY) {
        this.groundY = groundY;

        // Gravity
        this.vy += this.gravity;
        this.y += this.vy;

        // Clamp X to fixed position
        this.x = this.fixedX;

        // Ground collision
        this.isOnGround = false;
        if (this.y >= this.groundY) {
            if (this.vy >= 0) {
                this.y = this.groundY;
                this.vy = 0;
                this.isOnGround = true;
            }
        }

        // Run animation
        if (this.isOnGround && !this.isDucking) {
            this.runTimer += 1;
            if (this.runTimer > 6) {
                this.runTimer = 0;
                this.runFrame = (this.runFrame + 1) % 2;
            }
        } else {
            this.runFrame = 0;
        }
    }

    /** Bounding box (accounts for ducking). */
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.effectiveHeight,
            w: this.width,
            h: this.effectiveHeight,
        };
    }

    /** Render player. */
    render(ctx) {
        const b = this.getBounds();

        // ── Body ──
        ctx.fillStyle = '#015AA2';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // ── Chest stripe ──
        ctx.fillStyle = '#FFF200';
        const stripeY = b.y + (this.isDucking ? 6 : 14);
        ctx.fillRect(b.x, stripeY, b.w, this.isDucking ? 4 : 6);

        // ── Eye ──
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x + b.w - 10, b.y + (this.isDucking ? 4 : 8), 5, 5);
        ctx.fillStyle = '#111';
        ctx.fillRect(b.x + b.w - 9, b.y + (this.isDucking ? 5 : 9), 3, 3);

        // ── Legs (hidden when ducking) ──
        if (!this.isDucking) {
            ctx.fillStyle = '#003D80';
            const legOff = this.isOnGround ? (this.runFrame === 0 ? 0 : -4) : 0;
            ctx.fillRect(b.x + 4, b.y + b.h, 8, 8 + legOff);
            ctx.fillRect(b.x + b.w - 12, b.y + b.h, 8,
                8 + (this.isOnGround && this.runFrame === 0 ? -4 : 0));
        }
    }
}
