/**
 * This file was generated with the assistance of AI.
 */
/**
 * router.js – Single-Page Content Loader
 *
 * Always loads pages/home.html into the main content area.
 * Supports anchor scrolling via URL hash (#section-history, etc.).
 */

const Router = {
    /** @type {HTMLElement} */
    _container: null,

    /** @type {HTMLElement|null} */
    _websiteContainer: null,

    /** @type {boolean} */
    _loaded: false,

    /**
     * Initialize the router.
     * @param {HTMLElement} container  Element to render pages into.
     */
    init(container) {
        this._container = container;
        this._websiteContainer = document.getElementById('website-container');
        window.addEventListener('hashchange', () => this._onHashChange());
    },

    /**
     * Load the single page and scroll to any hash target.
     */
    async resolve() {
        if (!this._loaded) {
            await this._loadPage();
        }
        this._scrollToHash();
    },

    /** @private */
    async _loadPage() {
        const url = 'pages/home.html';
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            this._container.innerHTML = html;
            this._executeScripts(this._container);
            this._loaded = true;
            this._applyTheme('home');
        } catch (err) {
            console.error(`Router: failed to load "${url}"`, err);
            this._container.innerHTML = '<h1>404</h1><p>Page not found.</p>';
        }
    },

    /** @private */
    _onHashChange() {
        this._scrollToHash();
        this._updateActiveNav();
    },

    /** @private – Smooth-scroll to the section matching the current hash. */
    _scrollToHash() {
        const id = window.location.hash.replace('#', '');
        if (!id) return;
        const el = this._container.querySelector(`#${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    /**
     * Re-execute any <script> elements inside injected HTML.
     * @private
     * @param {HTMLElement} root
     */
    _executeScripts(root) {
        root.querySelectorAll('script').forEach((oldScript) => {
            const newScript = document.createElement('script');
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }
            newScript.textContent = oldScript.textContent;
            oldScript.replaceWith(newScript);
        });
    },

    /** @private */
    _applyTheme(page) {
        if (!this._websiteContainer) return;
        this._websiteContainer.className = this._websiteContainer.className
            .split(' ')
            .filter((c) => !c.startsWith('theme-'))
            .join(' ');
        this._websiteContainer.classList.add(`theme-${page}`);
    },

    /** @private */
    _updateActiveNav() {
        const hash = window.location.hash.replace('#', '') || 'section-hero';
        document.querySelectorAll('.nav-link').forEach((link) => {
            const isActive = link.getAttribute('href') === `#${hash}`;
            link.classList.toggle('active', isActive);
        });
    },
};

export default Router;
