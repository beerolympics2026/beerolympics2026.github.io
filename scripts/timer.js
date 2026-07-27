/**
 * timer.js – Unlock Timer Manager
 *
 * Manages the countdown after the website is unlocked.
 * Fires a callback when time expires.
 */

const UnlockTimer = {
    /** @type {number|null} */
    _expirationTime: null,

    /** @type {number|null} */
    _intervalId: null,

    /** @type {Function|null} */
    _onExpire: null,

    /** @type {Function|null} */
    _onTick: null,

    /** Duration in milliseconds. */
    DURATION_MS: 5 * 60 * 1000, // 5 minutes

    /**
     * Start the unlock timer.
     * @param {Function} onExpire  Called when timer reaches zero.
     * @param {Function} [onTick]  Called every second with remaining {minutes, seconds, percent}.
     */
    start(onExpire, onTick) {
        this.stop();
        this._expirationTime = Date.now() + this.DURATION_MS;
        this._onExpire = onExpire;
        this._onTick = onTick;

        this._intervalId = setInterval(() => this._tick(), 200);
        this._tick(); // immediate first tick
    },

    /**
     * Stop the timer without firing callbacks.
     */
    stop() {
        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._expirationTime = null;
        this._onExpire = null;
        this._onTick = null;
    },

    /**
     * @returns {number|null}  Remaining milliseconds, or null if not running.
     */
    getRemaining() {
        if (this._expirationTime === null) return null;
        const rem = this._expirationTime - Date.now();
        return rem > 0 ? rem : 0;
    },

    /**
     * @returns {boolean}
     */
    isRunning() {
        return this._intervalId !== null;
    },

    /**
     * Format remaining time as MM:SS.
     * @param {number} ms
     * @returns {string}
     */
    format(ms) {
        const totalSec = Math.ceil(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    /** @private */
    _tick() {
        const rem = this.getRemaining();
        if (rem === null) return;

        const totalSec = Math.ceil(rem / 1000);
        const minutes = Math.floor(totalSec / 60);
        const seconds = totalSec % 60;
        const percent = (rem / this.DURATION_MS) * 100;

        if (this._onTick) {
            this._onTick({ minutes, seconds, percent, remaining: rem });
        }

        if (rem <= 0) {
            this.stop();
            if (this._onExpire) this._onExpire();
        }
    },
};

export default UnlockTimer;
