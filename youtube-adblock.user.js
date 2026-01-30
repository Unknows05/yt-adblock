// ==UserScript==
// @name         Brave-Style YouTube Adblock
// @namespace    https://github.com/Unknows05/Brave-StyleYouTubeAdblock
// @version      1.2.4  // <-- NAIKKAN VERSI (dari 1.2.3 ke 1.2.4)
// @description  Multi-layer adblock mimicking Brave Shields - FIXED AUTO-PLAY BUG
// @author       Unknowns05
// @license      MIT
// @copyright    2024, Unknowns05
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @icon         https://brave.com/static-assets/images/brave-favicon.png
// @grant        none
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/Unknows05/Brave-StyleYouTubeAdblock/main/youtube-adblock.user.js
// @downloadURL  https://raw.githubusercontent.com/Unknows05/Brave-StyleYouTubeAdblock/main/youtube-adblock.user.js
// ==/UserScript==

/*
MIT License

Copyright (c) 2026 Unknowns05
Permission is hereby granted, free of charge, to any person obtaining a copy...
*/

(function() {
    'use strict';
    
    console.log('[Brave Adblock] v1.2.4 Loaded - Repo Updated');

    // ============================================================
    // CONFIGURATION
    // ============================================================
    
    const CONFIG = {
        enableNetworkBlock: true,
        enableDOMFilter: true,
        enableScriptBlock: true,
        enableAntiAdblockBypass: true,
        debug: false,
        autoUpdate: false  // Disabled - requires GM_info with @grant
    };

    // ============================================================
    // STATE MANAGEMENT - Track user interaction
    // ============================================================
    
    let state = {
        userPaused: false,
        lastUserInteraction: 0,
        isAdShowing: false,
        videoElement: null,
        adSkipAttempted: false
    };

    const USER_INTERACTION_TIMEOUT = 5000;

    // ============================================================
    // LAYER 1: NETWORK-LEVEL BLOCKING
    // ============================================================
    
    function setupNetworkBlocking() {
        if (!CONFIG.enableNetworkBlock) return;

        const AD_DOMAINS = [
            'doubleclick.net',
            'googleadservices.com',
            'adservice.google',
            'pagead2.googlesyndication.com',
            'pubads.g.doubleclick.net',
            'youtube-nocookie.com',
            'imasdk.googleapis.com',
            'static.ads-twitter.com',
            'ads.youtube.com'
        ];

        // Intercept XMLHttpRequest - FIXED: don't return undefined
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (typeof url === 'string') {
                const lowerUrl = url.toLowerCase();
                for (const domain of AD_DOMAINS) {
                    if (lowerUrl.includes(domain)) {
                        if (CONFIG.debug) console.log('🛡️ [NETWORK BLOCK] Blocked:', url);
                        // Set dummy URL to prevent actual request
                        return originalOpen.call(this, method, 'about:blank');
                    }
                }
            }
            return originalOpen.apply(this, arguments);
        };

        // Intercept Fetch API
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            let url = typeof input === 'string' ? input : input.url;
            if (url) {
                const lowerUrl = url.toLowerCase();
                for (const domain of AD_DOMAINS) {
                    if (lowerUrl.includes(domain)) {
                        if (CONFIG.debug) console.log('🛡️ [NETWORK BLOCK] Blocked fetch:', url);
                        return Promise.reject(new Error('Ad request blocked'));
                    }
                }
            }
            return originalFetch.apply(this, arguments);
        };

        log('Layer 1: Network blocking enabled');
    }

    // ============================================================
    // LAYER 2: DOM FILTERING (CSS Injection)
    // ============================================================
    
    function setupDOMFiltering() {
        if (!CONFIG.enableDOMFilter) return;

        const CSS_FILTERS = `
            .ad-showing, .ytp-ad-player-overlay, .ytp-ad-text-overlay, .ytp-ad-module,
            .ytp-ad-overlay-container, .ytp-ad-progress-list, .ytp-ad-skip-button,
            .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container, .videoAdUi,
            ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer,
            ytd-promoted-video-renderer, ytd-action-companion-ad-renderer,
            ytd-in-feed-ad-layout-renderer, ytd-ad-slot-renderer,
            ytd-banner-promo-renderer, ytd-enforcement-message-view-model,
            tp-yt-iron-overlay-backdrop, #masthead-ad, #player-ads,
            .style-scope.ytd-enforcement-message-view-model {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                pointer-events: none !important;
            }
            .ytp-ad-loading-spinner { display: none !important; }
        `;

        const style = document.createElement('style');
        style.id = 'brave-adblock-styles';
        style.textContent = CSS_FILTERS;
        
        if (document.head) {
            document.head.appendChild(style);
        } else {
            const observer = new MutationObserver(() => {
                if (document.head) {
                    document.head.appendChild(style);
                    observer.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true });
        }

        log('Layer 2: DOM filtering enabled');
    }

    // ============================================================
    // LAYER 3: SCRIPT BLOCKING
    // ============================================================
    
    function setupScriptBlocking() {
        if (!CONFIG.enableScriptBlock) return;

        const AD_SCRIPT_PATTERNS = [
            /adsbygoogle/, /google_ad/, /doubleclick/, /pubads/, /ima3/, /prebid/
        ];

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT') {
                        const src = node.src || node.textContent || '';
                        for (const pattern of AD_SCRIPT_PATTERNS) {
                            if (pattern.test(src)) {
                                node.remove();
                                if (CONFIG.debug) console.log('🛡️ [SCRIPT BLOCK] Removed:', pattern);
                                break;
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
        log('Layer 3: Script blocking enabled');
    }

    // ============================================================
    // USER INTERACTION TRACKING
    // ============================================================
    
    function setupUserInteractionTracking() {
        const getPlayerContainer = () => {
            return document.querySelector('.html5-video-player') || 
                   document.querySelector('video');
        };

        document.addEventListener('click', (e) => {
            const playerContainer = getPlayerContainer();
            const video = document.querySelector('video');
            if (playerContainer && playerContainer.contains(e.target)) {
                state.lastUserInteraction = Date.now();
                if (video) state.userPaused = video.paused;
            }
        }, true);

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
                state.lastUserInteraction = Date.now();
            }
        }, true);
    }

    // ============================================================
    // ANTI-ADBLOCK BYPASS
    // ============================================================
    
    function setupAntiAdblockBypass() {
        if (!CONFIG.enableAntiAdblockBypass) return;

        setInterval(() => {
            const video = document.querySelector('video');
            if (!video) return;

            // Remove anti-adblock elements
            document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-iron-overlay-backdrop').forEach(el => el.remove());
            
            // Dismiss buttons
            const dismissBtn = document.querySelector('#dismiss-button, [aria-label="Close"]');
            if (dismissBtn) dismissBtn.click();

            // Smart autoplay
            if (video.paused && !state.userPaused) {
                const timeSinceInteraction = Date.now() - state.lastUserInteraction;
                if (timeSinceInteraction > USER_INTERACTION_TIMEOUT && !state.isAdShowing) {
                    video.play().catch(() => {});
                }
            }
        }, 1000);

        log('Anti-adblock bypass enabled');
    }

    // ============================================================
    // SKIP BUTTON AUTO-CLICK
    // ============================================================
    
    function setupSkipButtonAutoClick() {
        setInterval(() => {
            const button = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
            if (button && button.offsetParent !== null) {
                button.click();
                log('⏭️ Auto-clicked skip button');
            }
        }, 300);
    }

    // ============================================================
    // AD DETECTION & HANDLING
    // ============================================================
    
    function setupAdDetection() {
        setInterval(() => {
            const adElement = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
            const video = document.querySelector('video');
            
            if (adElement && video) {
                state.isAdShowing = true;
                state.adSkipAttempted = false;
                video.muted = true;
                
                if (!state.adSkipAttempted && isFinite(video.duration)) {
                    try {
                        video.currentTime = video.duration + 0.1;
                        state.adSkipAttempted = true;
                        log('⏭️ Skipped ad');
                    } catch (e) {}
                }
            } else {
                state.isAdShowing = false;
                state.adSkipAttempted = false;
                if (video) video.muted = false;
            }
        }, 200);
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function log(message) {
        if (CONFIG.debug) console.log('🛡️ [Brave Adblock]', message);
    }

    function initialize() {
        log('Initializing Brave-Style Adblock v1.2.3...');
        
        setupUserInteractionTracking();
        setupNetworkBlocking();
        setupDOMFiltering();
        setupScriptBlocking();
        setupAdDetection();
        setupAntiAdblockBypass();
        setupSkipButtonAutoClick();
        
        log('✅ All layers active');
    }

    // ============================================================
    // START SCRIPT
    // ============================================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
