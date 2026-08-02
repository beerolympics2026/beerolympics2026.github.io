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

    /**
     * Background music playlist. All tracks are royalty-free music
     * taken from pixabay.com. The song switches to the next track
     * each time a beer is collected.
     * @type {string[]}
     */
    _bgPlaylist: [
        'audio/background.mp3',
        'audio/freesound_community-gamemusic-6082.mp3',
        'audio/pink_sound-speed-of-infinity-slap-house-instrumental-music-for-video-short-1-538151.mp3',
        'audio/sergequadrado-surf-blues-loop-507552.mp3',
        'audio/ncone-bgm-blues-guitar-loop-192099.mp3',
        'audio/bombinsound-house-version-3-537875.mp3',
        'audio/pink_sound-neon-symphony-phonk-house-background-music-for-video-21-second-533504.mp3',
        'audio/sonican-upbeat-latin-guitar-30-seconds-478219.mp3',
        'audio/west_tunes_thebeatchef-classic-afro-dancehall-drum-loop-102bpm-242737.mp3',
        'audio/alemaldonadoc-cancion-cine-sin-efectos-247534.mp3',
    ],

    /** @type {number} Index of the currently playing playlist track. */
    _bgIndex: 0,

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
        this._bgIndex = 0;
        this._bgMusic = new Audio(this._bgPlaylist[this._bgIndex]);
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
     * Switch to the next track in the background playlist and play it.
     * Called when a beer is collected.
     */
    playNextBackground() {
        if (!this._bgMusic || this._bgPlaylist.length === 0) return;
        this._bgIndex = (this._bgIndex + 1) % this._bgPlaylist.length;
        this._bgMusic.src = this._bgPlaylist[this._bgIndex];
        this._bgMusic.currentTime = 0;
        if (this._enabled) {
            this._bgMusic.play().catch(() => {});
        }
    },

    /**
     * Reset the playlist to the first track.
     * Called when a game session (re)starts.
     */
    resetBackground() {
        if (!this._bgMusic) return;
        this._bgIndex = 0;
        this._bgMusic.src = this._bgPlaylist[0];
        this._bgMusic.currentTime = 0;
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
