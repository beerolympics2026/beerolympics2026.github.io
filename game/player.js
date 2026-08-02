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
     * @param {number} x           Fixed screen X (centre of player)
     * @param {number} y           Starting Y (bottom / feet)
     * @param {number} groundY     Current ground Y
     * @param {number} scale       Size multiplier (default 1)
     * @param {number} [driveSpeed] Base horizontal speed of the world
     *                              (px/frame). Gravity and jump power are
     *                              derived from it so the jump stays
     *                              consistent if BASE_SPEED changes.
     */
    constructor(x, y, groundY, scale = 1, driveSpeed = 6) {
        this.scale = scale;
        this.fixedX = x;
        this.x = x;
        this.y = y;
        this.groundY = groundY;

        this.width = 28 * scale;
        this.height = 38 * scale;
        this.duckHeight = 20 * scale;           // hitbox when ducking
        this.vy = 0;

        // Physics are coupled to the world's base drive speed so that
        // increasing BASE_SPEED automatically re-scales the jump:
        //   gravity   ∝ v²  → keeps the jump APEX (120 px) constant
        //   jumpPower ∝ v   → keeps the horizontal JUMP DISTANCE (240 px) constant
        // Reference values (v = 6 px/frame): gravity 0.6, jumpPower −12.
        this.driveSpeed = driveSpeed;
        const V_REF = 6;
        this.gravity = 0.6 * (driveSpeed / V_REF) ** 2;
        this.jumpPower = -12 * (driveSpeed / V_REF);

        this.speedFactor = 1;   // game-speed multiplier driving gravity scale
        this.isOnGround = false;

        // Duck
        this.isDucking = false;

        this.runFrame = 0;
        this.runTimer = 0;
        this.wheelAngle = 0;   // drives wheel-spoke rotation + subtle bounce
    }

    /** Effective hitbox height (shorter when ducking). */
    get effectiveHeight() {
        return this.isDucking ? this.duckHeight : this.height;
    }

    /** Apply jump. */
    jump() {
        if (!this.isOnGround) return;
        // Jump power scales with √speed so the jump REACH stays identical
        // while gravity scaling makes the cart land sooner at higher speeds.
        this.vy = this.jumpPower * Math.sqrt(this.speedFactor);
        this.isOnGround = false;
    }

    /** Set ducking state. */
    setDucking(ducking) {
        this.isDucking = ducking;
    }

    /**
     * Advance one frame.
     * @param {number} groundY        Current ground level
     * @param {number} [speedFactor]  Game-speed multiplier (1 = normal);
     *                                gravity scales with it so the cart
     *                                lands faster when the game speeds up.
     */
    update(groundY, speedFactor = 1) {
        this.groundY = groundY;
        this.speedFactor = speedFactor;

        // Gravity
        this.vy += this.gravity * speedFactor;
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

        // Run animation (wheels roll + spokes spin while grounded).
        // Spin rate follows the actual drive speed, so the wheels roll
        // slowly at the start and spin up as the game accelerates.
        if (this.isOnGround && !this.isDucking) {
            this.runTimer += 1;
            if (this.runTimer > 6) {
                this.runTimer = 0;
                this.runFrame = (this.runFrame + 1) % 2;
            }
            this.wheelAngle += 0.02 * this.driveSpeed * this.speedFactor;
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

    /** Render player (shopping cart). */
    render(ctx) {
        const s = this.scale;
        const cx = this.x;
        const bottom = this.y;   // wheels rest on this line
        const duck = this.isDucking;
        const bounce = this.isOnGround ? Math.sin(this.wheelAngle * 2) * 0.6 * s : 0;

        /* ── Soft ground shadow (modern depth cue, fades while airborne) ── */
        const air = Math.min(1, Math.max(0, (this.groundY - bottom) / 150));
        ctx.fillStyle = `rgba(0, 0, 0, ${0.28 * (1 - air)})`;
        ctx.beginPath();
        ctx.ellipse(cx, bottom - 1, (16 - air * 5) * s, (3.5 - air * 1.2) * s, 0, 0, Math.PI * 2);
        ctx.fill();

        /* ── Warm glow under the cart (theme pop on the dark background) ── */
        const glow = ctx.createRadialGradient(cx, bottom, 0, cx, bottom, 28 * s);
        glow.addColorStop(0, 'rgba(255, 105, 0, 0.25)');
        glow.addColorStop(1, 'rgba(255, 105, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(cx, bottom, 28 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        /* ── Wheels ── */
        const wheelR = (duck ? 3 : 4) * s;
        const wheelY = bottom - wheelR;
        const axleGap = 9 * s;

        ctx.fillStyle = '#1E1E1E';
        for (const dir of [-1, 1]) {
            const wx = cx + dir * axleGap;
            ctx.beginPath();
            ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2);
            ctx.fill();

            // Hub
            ctx.fillStyle = '#FF6900';
            ctx.beginPath();
            ctx.arc(wx, wheelY, wheelR * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Spoke (rotates while rolling)
            ctx.strokeStyle = '#1E1E1E';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wx - Math.cos(this.wheelAngle) * wheelR * 0.7, wheelY - Math.sin(this.wheelAngle) * wheelR * 0.7);
            ctx.lineTo(wx + Math.cos(this.wheelAngle) * wheelR * 0.7, wheelY + Math.sin(this.wheelAngle) * wheelR * 0.7);
            ctx.stroke();

            ctx.fillStyle = '#1E1E1E';
        }

        /* ── Basket geometry ── */
        const basketBase = wheelY - wheelR + 2 * s;
        const basketH = (duck ? 10 : 22) * s;
        const basketTop = basketBase - basketH + bounce;
        const halfWTop = (duck ? 10 : 13) * s;
        const halfWBot = (duck ? 8 : 11) * s;

        /* ── Handle (behind the basket) ── */
        const handleUp = (duck ? 5 : 12) * s;

        // Dark outline first – keeps the handle visible against any background
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.7)';
        ctx.lineWidth = 4.5 * s;
        ctx.beginPath();
        ctx.moveTo(cx - halfWTop * 0.6, basketTop);
        ctx.quadraticCurveTo(
            cx - halfWTop - 8 * s,
            basketTop - handleUp * 0.7,
            cx - halfWTop - 4 * s,
            basketTop - handleUp
        );
        ctx.stroke();

        // Handle bar (slightly darker cream so it reads as background)
        ctx.strokeStyle = '#E9DCB4';
        ctx.lineWidth = 2.75 * s;
        ctx.beginPath();
        ctx.moveTo(cx - halfWTop * 0.6, basketTop);
        ctx.quadraticCurveTo(
            cx - halfWTop - 8 * s,
            basketTop - handleUp * 0.7,
            cx - halfWTop - 4 * s,
            basketTop - handleUp
        );
        ctx.stroke();

        /* ── Basket (flared, wire-mesh, in front of the handle) ── */
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 8 * s;
        ctx.fillStyle = 'rgba(255, 212, 0, 0.9)';
        ctx.beginPath();
        ctx.moveTo(cx - halfWTop, basketTop);
        ctx.lineTo(cx + halfWTop, basketTop);
        ctx.lineTo(cx + halfWBot, basketBase);
        ctx.lineTo(cx - halfWBot, basketBase);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#1E1E1E';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Horizontal mesh lines
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.45)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const t = i / 4;
            const y = basketTop + (basketBase - basketTop) * t;
            const hw = halfWTop + (halfWBot - halfWTop) * t;
            ctx.beginPath();
            ctx.moveTo(cx - hw, y);
            ctx.lineTo(cx + hw, y);
            ctx.stroke();
        }

        // Vertical mesh lines (follow the flare)
        for (let i = 1; i < 3; i++) {
            const t = i / 3;
            const xTop = cx - halfWTop + 2 * halfWTop * t;
            const xBase = cx - halfWBot + 2 * halfWBot * t;
            ctx.beginPath();
            ctx.moveTo(xTop, basketTop);
            ctx.lineTo(xBase, basketBase);
            ctx.stroke();
        }
    }
}
