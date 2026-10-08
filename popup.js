/**
 * YouTube Mouse XButton Skipper - Popup Script
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  xbutton1_action: 'seek_backward',
  xbutton2_action: 'seek_forward',
  skip_seconds: 5,
  show_osd: true,
  prevent_history_navigation: true,
  enable_shorts: true
};

const UI_ELEMENTS = {
  enabled: document.getElementById('enabled'),
  xbutton1_action: document.getElementById('xbutton1_action'),
  xbutton2_action: document.getElementById('xbutton2_action'),
  skip_seconds: document.getElementById('skip_seconds'),
  skipSecondsDisplay: document.getElementById('skipSecondsDisplay'),
  show_osd: document.getElementById('show_osd'),
  prevent_history_navigation: document.getElementById('prevent_history_navigation'),
  enable_shorts: document.getElementById('enable_shorts'),
  statusMsg: document.getElementById('statusMsg'),
  testerCard: document.getElementById('testerCard'),
  testerStatus: document.getElementById('testerStatus'),
  previewBtn4: document.getElementById('previewBtn4'),
  previewBtn5: document.getElementById('previewBtn5')
};

// Load saved settings
function init() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      UI_ELEMENTS.enabled.checked = items.enabled ?? DEFAULT_SETTINGS.enabled;
      UI_ELEMENTS.xbutton1_action.value = items.xbutton1_action || DEFAULT_SETTINGS.xbutton1_action;
      UI_ELEMENTS.xbutton2_action.value = items.xbutton2_action || DEFAULT_SETTINGS.xbutton2_action;
      UI_ELEMENTS.skip_seconds.value = items.skip_seconds || DEFAULT_SETTINGS.skip_seconds;
      UI_ELEMENTS.skipSecondsDisplay.textContent = `${items.skip_seconds || DEFAULT_SETTINGS.skip_seconds}s`;
      UI_ELEMENTS.show_osd.checked = items.show_osd ?? DEFAULT_SETTINGS.show_osd;
      UI_ELEMENTS.prevent_history_navigation.checked = items.prevent_history_navigation ?? DEFAULT_SETTINGS.prevent_history_navigation;
      UI_ELEMENTS.enable_shorts.checked = items.enable_shorts ?? DEFAULT_SETTINGS.enable_shorts;
    });
  }

  setupEventListeners();
  setupTesterListener();
}

let saveTimeout = null;
function saveSettings() {
  const newSettings = {
    enabled: UI_ELEMENTS.enabled.checked,
    xbutton1_action: UI_ELEMENTS.xbutton1_action.value,
    xbutton2_action: UI_ELEMENTS.xbutton2_action.value,
    skip_seconds: Number(UI_ELEMENTS.skip_seconds.value),
    show_osd: UI_ELEMENTS.show_osd.checked,
    prevent_history_navigation: UI_ELEMENTS.prevent_history_navigation.checked,
    enable_shorts: UI_ELEMENTS.enable_shorts.checked
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set(newSettings, () => {
      UI_ELEMENTS.statusMsg.textContent = '✓ Settings Saved';
      UI_ELEMENTS.statusMsg.classList.add('saved');

      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        UI_ELEMENTS.statusMsg.textContent = 'Settings auto-saved';
        UI_ELEMENTS.statusMsg.classList.remove('saved');
      }, 1500);
    });
  }
}

function setupEventListeners() {
  UI_ELEMENTS.enabled.addEventListener('change', saveSettings);
  UI_ELEMENTS.xbutton1_action.addEventListener('change', saveSettings);
  UI_ELEMENTS.xbutton2_action.addEventListener('change', saveSettings);
  UI_ELEMENTS.show_osd.addEventListener('change', saveSettings);
  UI_ELEMENTS.prevent_history_navigation.addEventListener('change', saveSettings);
  UI_ELEMENTS.enable_shorts.addEventListener('change', saveSettings);

  UI_ELEMENTS.skip_seconds.addEventListener('input', (e) => {
    UI_ELEMENTS.skipSecondsDisplay.textContent = `${e.target.value}s`;
    saveSettings();
  });
}

/**
 * Live Mouse Button Tester in popup
 */
function setupTesterListener() {
  const events = ['pointerdown', 'mousedown', 'mouseup', 'auxclick', 'contextmenu'];

  let releaseTimer4 = null;
  let releaseTimer5 = null;

  events.forEach(evt => {
    window.addEventListener(evt, (e) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'pointerdown' || e.type === 'mousedown') {
          if (e.button === 3) {
            UI_ELEMENTS.previewBtn4.classList.add('pressed');
            UI_ELEMENTS.testerStatus.innerHTML = `<span style="color: #ff5577; font-weight: 600;">Mouse 4 (Back)</span> detected!`;
            if (releaseTimer4) clearTimeout(releaseTimer4);
            releaseTimer4 = setTimeout(() => {
              UI_ELEMENTS.previewBtn4.classList.remove('pressed');
            }, 500);
          } else if (e.button === 4) {
            UI_ELEMENTS.previewBtn5.classList.add('pressed');
            UI_ELEMENTS.testerStatus.innerHTML = `<span style="color: #4dc3ff; font-weight: 600;">Mouse 5 (Forward)</span> detected!`;
            if (releaseTimer5) clearTimeout(releaseTimer5);
            releaseTimer5 = setTimeout(() => {
              UI_ELEMENTS.previewBtn5.classList.remove('pressed');
            }, 500);
          }
        }
      }
    }, { capture: true });
  });
}

document.addEventListener('DOMContentLoaded', init);
