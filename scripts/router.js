/**
 * router.js – Client-Side Page Router
 *
 * Loads HTML fragments into the main content area based on the URL hash.
 * Supports hash-based navigation (no page reloads).
 */

const Router = {
    /** @type {HTMLElement} */
    _container: null,

    /** @type {HTMLElement|null} */
    _websiteContainer: null,

    /** @type {string} */
    _currentPage: '',

    /** @type {Object<string, string>} Cache of loaded HTML. */
    _cache: {},

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
     * Navigate to a page.
     * @param {string} page  Page name (e.g., 'home', 'gallery').
     */
    async navigate(page) {
        const hash = `#${page}`;
        if (window.location.hash !== hash) {
            window.location.hash = hash;
        } else {
            await this._loadPage(page);
        }
    },

    /**
     * Detect and load the page from the current hash.
     * Called on initial load.
     */
    async resolve() {
        const hash = window.location.hash.replace('#', '') || 'home';
        await this._loadPage(hash);
    },

    /**
     * @returns {string}
     */
    getCurrentPage() {
        return this._currentPage;
    },

    /** @private */
    async _onHashChange() {
        const page = window.location.hash.replace('#', '') || 'home';
        await this._loadPage(page);
    },

    /** @private */
    async _loadPage(page) {
        if (page === this._currentPage) return;
        const url = `pages/${page}.html`;

        try {
            let html = this._cache[url];
            if (!html) {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                html = await res.text();
                this._cache[url] = html;
            }
            this._container.innerHTML = html;
            this._executeScripts(this._container);
            this._currentPage = page;
            this._applyTheme(page);
            this._updateActiveNav(page);
        } catch (err) {
            console.error(`Router: failed to load "${url}"`, err);
            this._container.innerHTML = `<h1>404</h1><p>Page not found.</p>`;
        }
    },

    /**
     * Re-execute any <script> elements inside injected HTML.
     * innerHTML does not execute scripts by default.
     * @private
     * @param {HTMLElement} root
     */
    _executeScripts(root) {
        root.querySelectorAll('script').forEach((oldScript) => {
            const newScript = document.createElement('script');
            // Copy attributes
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }
            newScript.textContent = oldScript.textContent;
            oldScript.replaceWith(newScript);
        });
    },

    /**
     * Set the colour-theme class on the website container.
     * @private
     * @param {string} page
     */
    _applyTheme(page) {
        if (!this._websiteContainer) return;
        // Remove all theme-* classes
        this._websiteContainer.className = this._websiteContainer.className
            .split(' ')
            .filter((c) => !c.startsWith('theme-'))
            .join(' ');
        // Add the new theme class
        this._websiteContainer.classList.add(`theme-${page}`);
    },

    /** @private */
    _updateActiveNav(page) {
        document.querySelectorAll('.nav-link').forEach((link) => {
            const isActive = link.dataset.page === page;
            link.classList.toggle('active', isActive);
        });
    },
};

export default Router;
