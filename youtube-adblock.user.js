// ==UserScript==
// @name         Brave-Style YouTube Adblock
// @namespace    https://github.com/Unknows05/yt-adblock
// @version      1.2.3
// @description  Multi-layer adblock mimicking Brave Shields
// @author       Unknowns05
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @icon         https://brave.com/static-assets/images/brave-favicon.png
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Unknows05/yt-adblock/main/youtube-adblock.user.js
// @downloadURL  https://raw.githubusercontent.com/Unknows05/yt-adblock/main/youtube-adblock.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    // Network blocking
    const blocked = ['doubleclick.net', 'googleadservices.com', 'adservice.google'];
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, url) {
        if (blocked.some(d => url.includes(d))) return;
        return origOpen.apply(this, arguments);
    };
    
    // CSS hiding
    const css = `
        .ad-showing, .ytp-ad-player-overlay, ytd-display-ad-renderer,
        ytd-enforcement-message-view-model, tp-yt-iron-overlay-backdrop,
        #masthead-ad, .ytp-ad-skip-button { display: none !important; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    
    // Ad skip & anti-adblock bypass
    setInterval(() => {
        document.querySelectorAll('ytd-enforcement-message-view-model, tp-yt-iron-overlay-backdrop').forEach(e => e.remove());
        const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
        if (skip) skip.click();
        const video = document.querySelector('video');
        if (video && document.querySelector('.ad-showing')) {
            video.muted = true;
            if (video.duration) video.currentTime = video.duration;
        }
    }, 500);
    
    console.log('[Brave Adblock] Active');
})();
