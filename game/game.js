/**
 * This file was generated with the assistance of AI.
 */
/**
 * game.js – Game Module
 *
 * Bridges the side-scrolling runner scene with the application.
 */

import Scene from './scene.js';
import AudioManager from '../scripts/audio.js';

const Game = {
    /** @type {HTMLCanvasElement|null} */
    canvas: null,

    /** @type {Scene|null} */
    scene: null,

    /** @type {boolean} */
    _running: false,

    /**
     * Initialize the game module.
     * @param {string} canvasId  ID of the canvas element
     * @param {Function} onWin   Called when the player wins
     * @param {Function} onLose  Called when the player loses
     */
    init(canvasId, onWin, onLose) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`);

        this._resizeCanvas();

        this.scene = new Scene(this.canvas);
        this.scene.init(this.canvas.width, this.canvas.height);

        this.scene.setCallbacks(
            () => {
                this._running = false;
                AudioManager.stopBackground();
                AudioManager.playSFX('audio/end.mp3');
                onWin();
            },
            () => {
                this._running = false;
                AudioManager.stopBackground();
                AudioManager.playSFX('audio/end.mp3');
                onLose();
            },
            (score) => {
                const el = document.getElementById('game-score');
                if (el) el.textContent = `NO MATH: ${score}`;
            },
            () => { AudioManager.playSFX('audio/jump.mp3', 0.5); }
        );

        // Keyboard
        this._onKeyDown = (e) => {
            if (this.scene) this.scene.handleKeyDown(e);
        };
        this._onKeyUp = (e) => {
            if (this.scene) this.scene.handleKeyUp(e);
        };
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);

        // Touch — register on the canvas so only game-area touches are captured
        this._onTouchStart = (e) => {
            e.preventDefault(); // prevent scrolling / zooming on the canvas
            const t = e.touches[0];
            if (t && this.scene) {
                const rect = this.canvas.getBoundingClientRect();
                this.scene.handleTouchStart(
                    t.clientX - rect.left,
                    t.clientY - rect.top
                );
            }
        };
        this._onTouchMove = (e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (t && this.scene) {
                const rect = this.canvas.getBoundingClientRect();
                this.scene.handleTouchMove(
                    t.clientX - rect.left,
                    t.clientY - rect.top
                );
            }
        };
        this._onTouchEnd = (e) => {
            e.preventDefault();
            if (this.scene) this.scene.handleTouchEnd();
        };
        this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });

        // Resize
        this._onResize = () => {
            this._resizeCanvas();
            if (this.scene) {
                this.scene.init(this.canvas.width, this.canvas.height);
            }
        };
        window.addEventListener('resize', this._onResize);
    },

    /**
     * Start the game.
     */
    start() {
        if (!this.scene) return;
        this._running = true;
        this.scene.start();
    },

    /**
     * Stop the game.
     */
    stop() {
        this._running = false;
        if (this.scene) this.scene.stop();
    },

    /**
     * Reset the game.
     */
    reset() {
        this.stop();
        if (this.scene) {
            this.scene.init(this.canvas.width, this.canvas.height);
        }
    },

    /**
     * Clean up.
     */
    destroy() {
        this.stop();
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this._onTouchStart);
            this.canvas.removeEventListener('touchmove', this._onTouchMove);
            this.canvas.removeEventListener('touchend', this._onTouchEnd);
        }
        window.removeEventListener('resize', this._onResize);
        this.canvas = null;
        this.scene = null;
    },

    /**
     * @returns {boolean}
     */
    isRunning() {
        return this._running;
    },

    /**
     * Secret cheat — immediately triggers the win condition.
     */
    cheatWin() {
        if (!this.scene || !this._running) return;
        this._running = false;
        this.scene.gameOver = true;
        this.scene.won = true;
        if (this.scene._onWin) this.scene._onWin();
    },

    /** @private */
    _resizeCanvas() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
        }
    },
};

export default Game;
