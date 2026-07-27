/**
 * state.js – Application State Manager
 *
 * Central store for all application state.
 * Components can subscribe to changes via listeners.
 */

const State = {
    /** @type {object} Internal state store */
    _data: {
        gameStarted: false,
        gameCompleted: false,
        websiteUnlocked: false,
        unlockExpirationTime: null,
        musicEnabled: false,
        score: 0,
    },

    /** @type {Map<string, Set<Function>>} */
    _listeners: new Map(),

    /**
     * Get a state value.
     * @param {string} key
     * @returns {*}
     */
    get(key) {
        return this._data[key];
    },

    /**
     * Set a state value and notify listeners.
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
        const prev = this._data[key];
        if (prev === value) return;
        this._data[key] = value;
        this._notify(key, value, prev);
    },

    /**
     * Reset state to defaults.
     */
    reset() {
        this.set('gameStarted', false);
        this.set('gameCompleted', false);
        this.set('websiteUnlocked', false);
        this.set('unlockExpirationTime', null);
        this.set('score', 0);
        // Do not reset musicEnabled here – it persists across sessions
    },

    /**
     * Subscribe to changes on a key.
     * @param {string} key
     * @param {Function} fn  Callback receives (newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    on(key, fn) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(fn);
        return () => this._listeners.get(key)?.delete(fn);
    },

    /**
     * Subscribe to a single change on a key.
     * @param {string} key
     * @param {Function} fn
     * @returns {Function} Unsubscribe function
     */
    once(key, fn) {
        const wrapper = (newVal, oldVal) => {
            fn(newVal, oldVal);
            unsub();
        };
        const unsub = this.on(key, wrapper);
        return unsub;
    },

    /** @private */
    _notify(key, newVal, oldVal) {
        this._listeners.get(key)?.forEach((fn) => {
            try { fn(newVal, oldVal); } catch (e) { console.error(e); }
        });
    },
};

export default State;
