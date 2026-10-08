/**
 * YouTube Mouse XButton Skipper - Content Script
 * Intercepts Mouse 4 & Mouse 5 (XButtons) to skip/seek/control YouTube videos.
 */

(function () {
  'use strict';

  // Default Settings
  const DEFAULT_SETTINGS = {
    enabled: true,
    xbutton1_action: 'seek_backward', // Mouse 4 (Back)
    xbutton2_action: 'seek_forward',  // Mouse 5 (Forward)
    skip_seconds: 5,
    show_osd: true,
    prevent_history_navigation: true,
    work_anywhere_on_page: true,
    enable_shorts: true,
    volume_step: 5
  };

  let settings = { ...DEFAULT_SETTINGS };

  // Load settings from chrome.storage
  function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
        if (stored) {
          settings = { ...DEFAULT_SETTINGS, ...stored };
        }
      });
    }
  }

  loadSettings();

  // Listen for settings changes from popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        for (const key in changes) {
          settings[key] = changes[key].newValue;
        }
      }
    });
  }

  /**
   * Locate the most relevant YouTube <video> element.
   */
  function getActiveVideo() {
    // 1. YouTube Shorts check
    if (window.location.pathname.startsWith('/shorts')) {
      const activeShort = document.querySelector('ytd-reel-video-renderer[is-active] video') ||
                          document.querySelector('ytd-shorts video');
      if (activeShort) return activeShort;
    }

    // 2. Main Watch Player
    const mainVideo = document.querySelector('#movie_player video, .html5-main-video');
    if (mainVideo) return mainVideo;

    // 3. Fallback to any visible playing video or any video
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    // Prefer playing video
    const playing = videos.find(v => !v.paused && v.currentTime > 0);
    if (playing) return playing;

    // Prefer video in viewport
    const visible = videos.find(v => {
      const rect = v.getBoundingClientRect();
      return rect.width > 100 && rect.height > 100 && rect.top < window.innerHeight && rect.bottom > 0;
    });

    return visible || videos[0];
  }

  /**
   * Get YouTube Player Object (if available on page)
   */
  function getMoviePlayer() {
    return document.getElementById('movie_player') || document.querySelector('.html5-video-player');
  }

  /**
   * Actions Dispatcher
   */
  function executeAction(actionName) {
    const video = getActiveVideo();
    const moviePlayer = getMoviePlayer();

    if (!video && !['next_video', 'prev_video'].includes(actionName)) {
      return;
    }

    const skipSec = Number(settings.skip_seconds) || 5;

    switch (actionName) {
      case 'seek_backward': {
        if (video) {
          const newTime = Math.max(0, video.currentTime - skipSec);
          video.currentTime = newTime;
          showOSD('rewind', `-${skipSec}s`);
        }
        break;
      }

      case 'seek_forward': {
        if (video) {
          const maxDuration = video.duration || Infinity;
          const newTime = Math.min(maxDuration, video.currentTime + skipSec);
          video.currentTime = newTime;
          showOSD('forward', `+${skipSec}s`);
        }
        break;
      }

      case 'prev_video': {
        // Try YouTube native prev button or history back
        const prevBtn = document.querySelector('.ytp-prev-button, a.ytp-prev-button');
        if (prevBtn && prevBtn.getAttribute('aria-disabled') !== 'true') {
          prevBtn.click();
          showOSD('prev', 'Previous Video');
        } else if (moviePlayer && typeof moviePlayer.previousVideo === 'function') {
          moviePlayer.previousVideo();
          showOSD('prev', 'Previous Video');
        } else {
          // If in Shorts, scroll to previous short
          if (window.location.pathname.startsWith('/shorts')) {
            const prevShortBtn = document.querySelector('#navigation-button-up button, #prev-button');
            if (prevShortBtn) {
              prevShortBtn.click();
              showOSD('prev', 'Previous Short');
              break;
            }
          }
          showOSD('warning', 'No Previous Video');
        }
        break;
      }

      case 'next_video': {
        // Try YouTube native next button
        const nextBtn = document.querySelector('.ytp-next-button, a.ytp-next-button');
        if (nextBtn && nextBtn.getAttribute('aria-disabled') !== 'true') {
          nextBtn.click();
          showOSD('next', 'Next Video');
        } else if (moviePlayer && typeof moviePlayer.nextVideo === 'function') {
          moviePlayer.nextVideo();
          showOSD('next', 'Next Video');
        } else {
          // If in Shorts, scroll to next short
          if (window.location.pathname.startsWith('/shorts')) {
            const nextShortBtn = document.querySelector('#navigation-button-down button, #next-button');
            if (nextShortBtn) {
              nextShortBtn.click();
              showOSD('next', 'Next Short');
              break;
            }
          }
          showOSD('warning', 'No Next Video');
        }
        break;
      }

      case 'prev_chapter': {
        // Jump chapter using YouTube hotkey Ctrl+ArrowLeft or player API
        simulateChapterJump(-1);
        showOSD('prev_chapter', 'Previous Chapter');
        break;
      }

      case 'next_chapter': {
        // Jump chapter using YouTube hotkey Ctrl+ArrowRight or player API
        simulateChapterJump(1);
        showOSD('next_chapter', 'Next Chapter');
        break;
      }

      case 'play_pause': {
        if (video) {
          if (video.paused) {
            video.play();
            showOSD('play', 'Play');
          } else {
            video.pause();
            showOSD('pause', 'Pause');
          }
        }
        break;
      }

      case 'speed_toggle': {
        if (video) {
          const speeds = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];
          let currentSpeed = video.playbackRate || 1;
          let nextIndex = (speeds.indexOf(currentSpeed) + 1) % speeds.length;
          let newSpeed = speeds[nextIndex];
          video.playbackRate = newSpeed;
          showOSD('speed', `${newSpeed}x Speed`);
        }
        break;
      }

      case 'volume_up': {
        if (video) {
          const step = (Number(settings.volume_step) || 5) / 100;
          video.volume = Math.min(1, video.volume + step);
          video.muted = false;
          showOSD('volume_up', `${Math.round(video.volume * 100)}%`);
        }
        break;
      }

      case 'volume_down': {
        if (video) {
          const step = (Number(settings.volume_step) || 5) / 100;
          video.volume = Math.max(0, video.volume - step);
          showOSD('volume_down', `${Math.round(video.volume * 100)}%`);
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Chapter navigation simulation
   */
  function simulateChapterJump(direction) {
    const key = direction > 0 ? 'ArrowRight' : 'ArrowLeft';
    const keyCode = direction > 0 ? 39 : 37;

    const eventOptions = {
      key: key,
      code: key,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: true
    };

    const target = document.querySelector('#movie_player') || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
    target.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
  }

  /**
   * Visual On-Screen Display (OSD) Toast
   */
  let osdTimeout = null;
  function showOSD(type, text) {
    if (!settings.show_osd) return;

    let osdContainer = document.getElementById('yt-xbutton-osd');
    if (!osdContainer) {
      osdContainer = document.createElement('div');
      osdContainer.id = 'yt-xbutton-osd';
      osdContainer.className = 'yt-xbutton-osd';
      document.body.appendChild(osdContainer);
    }

    // SVG Icons
    const icons = {
      rewind: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>`,
      forward: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>`,
      prev: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
      next: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
      prev_chapter: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/></svg>`,
      next_chapter: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/></svg>`,
      play: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
      pause: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
      volume_up: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
      volume_down: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
      speed: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.28-10.43zM10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`
    };

    const iconSvg = icons[type] || icons['forward'];

    osdContainer.innerHTML = `
      <div class="yt-xbutton-osd-content">
        <span class="yt-xbutton-icon">${iconSvg}</span>
        <span class="yt-xbutton-text">${text}</span>
      </div>
    `;

    osdContainer.classList.remove('active');
    // Trigger reflow to restart CSS animation
    void osdContainer.offsetWidth;
    osdContainer.classList.add('active');

    if (osdTimeout) clearTimeout(osdTimeout);
    osdTimeout = setTimeout(() => {
      osdContainer.classList.remove('active');
    }, 1200);
  }

  /**
   * Determine if the event target is an interactive input where we shouldn't hijack
   */
  function isInteractiveElement(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
      return true;
    }
    // YouTube comment box or search bar
    if (target.closest('#contenteditable-root, ytd-commentbox, #search-input, ytd-searchbox')) {
      return true;
    }
    return false;
  }

  /**
   * Mouse Event Interceptor
   * Mouse 4 = button 3 (Back)
   * Mouse 5 = button 4 (Forward)
   */
  let lastActionTimestamp = 0;
  const DEBOUNCE_MS = 180; // avoid multi-triggering from fast pointer/mouse events

  function handleMouseEvent(e) {
    if (!settings.enabled) return;

    // We only care about XButtons (button 3 and button 4)
    const isButton3 = e.button === 3;
    const isButton4 = e.button === 4;

    if (!isButton3 && !isButton4) return;

    // If disabled on shorts
    if (window.location.pathname.startsWith('/shorts') && !settings.enable_shorts) {
      return;
    }

    // Prevent browser back/forward history navigation!
    if (settings.prevent_history_navigation) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    // Only process action on pointerdown / mousedown to be responsive
    if (e.type !== 'pointerdown' && e.type !== 'mousedown') {
      return;
    }

    // Avoid typing conflicts in inputs if desired
    if (isInteractiveElement(e.target)) {
      return;
    }

    const now = Date.now();
    if (now - lastActionTimestamp < DEBOUNCE_MS) {
      return;
    }
    lastActionTimestamp = now;

    if (isButton3) {
      executeAction(settings.xbutton1_action);
    } else if (isButton4) {
      executeAction(settings.xbutton2_action);
    }
  }

  // Intercept at capture phase so we capture before browser / YouTube SPA navigation
  const eventTypes = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick', 'click', 'contextmenu'];

  eventTypes.forEach(evtType => {
    window.addEventListener(evtType, handleMouseEvent, { capture: true, passive: false });
  });

  console.log('🚀 YouTube Mouse XButton Skipper initialized.');
})();
