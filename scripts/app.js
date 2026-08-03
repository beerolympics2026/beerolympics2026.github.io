/**
 * This file was generated with the assistance of AI.
 */
/**
 * app.js – Main Application Entry Point
 *
 * Orchestrates the entire application:
 * - Loading → Intro → Game → Website (unlocked)
 *
 * Flow:
 *   1. Show loading screen (simulated)
 *   2. Show intro screen with Start button
 *   3. On Start → show pre-game notification → start game
 *   4. Win  → hide game → unlock website
 *   5. Lose → show game overlay with restart option
 */

import State from './state.js';
import AudioManager from './audio.js';
import Router from './router.js';
import Game from '../game/game.js';
import { WIN_BEERS } from '../game/scene.js';

/* ── DOM References ── */
const $ = (id) => document.getElementById(id);

const screens = {
    loading: $('loading-screen'),
    intro: $('intro-screen'),
    game: $('game-screen'),
    website: $('website-container'),
};

const els = {
    startBtn: $('start-button'),
    gameOverlay: $('game-overlay'),
    gameResultTitle: $('game-result-title'),
    gameResultMessage: $('game-result-message'),
    gameRestartBtn: $('game-restart-btn'),
    instructionsModal: $('game-instructions'),
    instructionsAcceptBtn: $('instructions-accept-btn'),
    pageContent: $('page-content'),
};

/* ── Screen Helpers ── */
function showScreen(screen, show) {
    screen.classList.toggle('hidden', !show);
}

function showOnly(...screensToShow) {
    const all = Object.values(screens);
    all.forEach((s) => {
        const shouldShow = screensToShow.includes(s);
        s.classList.toggle('hidden', !shouldShow);
    });
}

/* ── Loading Phase ── */
async function runLoading() {
    showOnly(screens.loading);
    // Simulate loading time (3s matches the CSS animation)
    await new Promise((r) => setTimeout(r, 3000));
}

/* ── Intro Phase ── */
function showIntro() {
    showOnly(screens.intro);
    State.reset();
}

/* ── Game Phase ── */

/* ── Pre-game instructions notification ── */

/**
 * Show the "how to play" notification and switch to the game screen.
 * The game is NOT started yet – it only begins once the player presses
 * "Easy - Lets go!".
 */
function showGameInstructions() {
    showOnly(screens.game);
    if (els.instructionsModal) els.instructionsModal.classList.remove('hidden');
}

/** Hide the pre-game notification. */
function hideGameInstructions() {
    if (els.instructionsModal) els.instructionsModal.classList.add('hidden');
}

/** Player accepted the notification → start the actual game. */
function acceptGameInstructions() {
    hideGameInstructions();
    startGame();
}

function startGame() {
    showOnly(screens.game);

    // Init audio on user gesture
    AudioManager.init();
    AudioManager.resetBackground();
    AudioManager.playBackground();

    // Reset and start the game
    Game.reset();
    Game.start();
}

function onGameWin() {
    State.set('gameCompleted', true);
    State.set('websiteUnlocked', true);

    // Show victory overlay briefly, then transition to website
    els.gameResultTitle.textContent = 'Victory!';
    els.gameResultMessage.textContent = `You collected all ${WIN_BEERS} beers! Website unlocked.`;
    showGameOverlay(true);

    setTimeout(() => {
        showGameOverlay(false);
        unlockWebsite();
    }, 1500);
}

function onGameLose() {
    els.gameResultTitle.textContent = 'The Cashier Said "Nope".';
    els.gameResultMessage.textContent = 'Do you even want to register? ... Try again!';
    showGameOverlay(true);
}

function showGameOverlay(show) {
    els.gameOverlay.classList.toggle('hidden', !show);
}

function restartGame() {
    showGameOverlay(false);
    AudioManager.resetBackground();
    AudioManager.playBackground();
    Game.reset();
    Game.start();
}

/* ── Website Unlock ── */
async function unlockWebsite() {
    showOnly(screens.website);

    // Initialize the router
    Router.init(els.pageContent);
    await Router.resolve();
}

/* ── Initialization ── */
async function init() {
    // ── 1. Loading screen ──
    await runLoading();

    // ── 2. Intro screen ──
    showIntro();

    // ── 3. Wire up events ──
    els.startBtn.addEventListener('click', () => {
        State.set('gameStarted', true);
        AudioManager.setEnabled(true);
        AudioManager.init();
        AudioManager.playSFX('audio/start.mp3');
        // Show the pre-game notification; the game only starts after it is
        // accepted via "Easy - Lets go!".
        showGameInstructions();
    });

    els.instructionsAcceptBtn.addEventListener('click', acceptGameInstructions);
    els.gameRestartBtn.addEventListener('click', restartGame);

    // Keyboard shortcut: Space to start from intro / accept the notification
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
            // First accept the pre-game notification if it is visible
            if (els.instructionsModal && !els.instructionsModal.classList.contains('hidden')) {
                e.preventDefault();
                els.instructionsAcceptBtn.click();
                return;
            }
            if (!screens.intro.classList.contains('hidden') && !State.get('gameStarted')) {
                e.preventDefault();
                els.startBtn.click();
            }
        }
    });

    // ── 4. Secret cheat button ──
    const cheatBtn = document.getElementById('cheat-btn');
    if (cheatBtn) {
        cheatBtn.addEventListener('click', () => {
            Game.cheatWin();
        });
    }

    // ── 5. Initialize the game system ──
    Game.init('game-canvas', onGameWin, onGameLose);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
