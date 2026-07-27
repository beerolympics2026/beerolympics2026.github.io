/**
 * This file was generated with the assistance of AI.
 */
/**
 * audio.js – Audio Manager
 *
 * Handles background music and sound effects.
 * Respects browser autoplay policies – no audio plays before user interaction.
 */

const AudioManager = {
    /** @type {HTMLAudioElement|null} */
    _bgMusic: null,

    /** @type {string} */
    _bgSrc: 'audio/background.mp3',

    /** @type {Object<string, HTMLAudioElement>} */
    _sfxCache: {},

    /** @type {boolean} */
    _enabled: true,

    /**
     * Must be called after a user gesture to unlock the audio context.
     * Creates/resumes the background audio element.
     */
    init() {
        if (this._bgMusic) return;
        this._bgMusic = new Audio(this._bgSrc);
        this._bgMusic.loop = true;
        this._bgMusic.volume = 0.5;
        // Preload nothing – will load on play
        this._bgMusic.preload = 'none';
    },

    /**
     * Start background music (requires prior init call).
     */
    playBackground() {
        if (!this._enabled || !this._bgMusic) return;
        this._bgMusic.play().catch(() => {
            // Browser may still block – that's ok
        });
    },

    /**
     * Pause background music.
     */
    pauseBackground() {
        if (this._bgMusic) {
            this._bgMusic.pause();
        }
    },

    /**
     * Stop background music and reset to start.
     */
    stopBackground() {
        if (this._bgMusic) {
            this._bgMusic.pause();
            this._bgMusic.currentTime = 0;
        }
    },

    /**
     * Play a sound effect once.
     * @param {string} src  Path to audio file
     * @param {number} [volume=0.7]
     */
    playSFX(src, volume = 0.7) {
        if (!this._enabled) return;
        let sfx = this._sfxCache[src];
        if (!sfx) {
            sfx = new Audio(src);
            sfx.preload = 'auto';
            this._sfxCache[src] = sfx;
        }
        sfx.volume = volume;
        sfx.currentTime = 0;
        sfx.play().catch(() => {});
    },

    /**
     * Enable or disable all audio.
     * @param {boolean} on
     */
    setEnabled(on) {
        this._enabled = on;
        if (!on) {
            this.pauseBackground();
        }
    },

    /**
     * @returns {boolean}
     */
    isEnabled() {
        return this._enabled;
    },

    /**
     * Cleanup and release resources.
     */
    destroy() {
        this.stopBackground();
        this._bgMusic = null;
        this._sfxCache = {};
    },
};

export default AudioManager;
