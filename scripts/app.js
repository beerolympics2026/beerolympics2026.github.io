/**
 * This file was generated with the assistance of AI.
 */
/**
 * app.js – Main Application Entry Point
 *
 * Orchestrates the entire application:
 * - Loading → Intro → Game → Website (unlocked) → Timer → Expiry → Reset
 *
 * Flow:
 *   1. Show loading screen (simulated)
 *   2. Show intro screen with Start button
 *   3. On Start → hide intro → init audio → start game
 *   4. Win  → hide game → unlock website → start 10-min timer
 *   5. Lose → show game overlay with restart option
 *   6. Timer expires → fade website → return to intro
 */

import State from './state.js';
import AudioManager from './audio.js';
import UnlockTimer from './timer.js';
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
    gameStartNote: $('game-start-note'),
    instructionsModal: $('game-instructions'),
    instructionsAcceptBtn: $('instructions-accept-btn'),
    timerText: $('access-timer-text'),
    timerFill: $('access-timer-fill'),
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
let startNoteTimer = null;

/**
 * Show the orientation tip for a few seconds at the start of a game.
 * It is a pure overlay – the player can ignore it and play right away.
 */
function showStartNote() {
    if (!els.gameStartNote) return;
    els.gameStartNote.classList.remove('hidden');
    clearTimeout(startNoteTimer);
    startNoteTimer = setTimeout(() => {
        els.gameStartNote.classList.add('hidden');
    }, 4000);
}

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

    // Brief orientation tip ("landscape / desktop view")
    showStartNote();
}

function onGameWin() {
    State.set('gameCompleted', true);
    State.set('websiteUnlocked', true);

    // Show victory overlay briefly, then transition to website
    els.gameResultTitle.textContent = 'Victory!';
    els.gameResultMessage.textContent = `You collected all ${WIN_BEERS} beers! Website unlocked for 5 minutes.`;
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
    showStartNote();
}

/* ── Website Unlock ── */
async function unlockWebsite() {
    showOnly(screens.website);

    // Initialize the router
    Router.init(els.pageContent);
    await Router.resolve();

    // Reset countdown display so a fresh session starts in the normal color
    if (els.timerText) els.timerText.style.color = '';

    // Start the 10-minute countdown
    UnlockTimer.start(
        // onExpire
        () => {
            lockWebsite();
        },
        // onTick
        ({ minutes, seconds, percent }) => {
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} remaining`;
            if (els.timerText) els.timerText.textContent = timeStr;
            if (els.timerFill) els.timerFill.style.width = `${percent}%`;

            // Warn when < 30 seconds
            if (minutes === 0 && seconds <= 30) {
                els.timerText.style.color = '#ff5252';
            }
        }
    );
}

function lockWebsite() {
    AudioManager.stopBackground();
    AudioManager.playSFX('audio/end.mp3');

    // Hide the unlocked website again (CSS fade-out on .screen.hidden),
    // then switch back to the start screen. In-page navigation is used
    // instead of location.reload() – full reloads are unreliable or
    // blocked in several mobile / in-app browsers.
    screens.website.classList.add('hidden');

    setTimeout(() => {
        showOnly(screens.intro);
        State.reset();
    }, 700); // just after the CSS transition (0.6s)
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
