import { SVG_ICONS } from '../icons.js';
import { trapFocus } from '../utils/focus-trap.js';
import { escapeHtml } from '../utils/rich-text.js';

export interface SettingsModalOptions {
  typewriterSpeed: number;
  autoDelayMs: number;
  musicVolume?: number;
  soundVolume?: number;
  dyslexiaFont?: boolean;
  highContrast?: boolean;
  currentLang?: string;
  availableLangs?: string[];
  onSettingsChange: (settings: {
    typewriterSpeed: number;
    autoDelayMs: number;
    musicVolume?: number;
    soundVolume?: number;
    dyslexiaFont?: boolean;
    highContrast?: boolean;
    lang?: string;
  }) => void;
}

export function showSettingsModal(rootEl: HTMLElement, options: SettingsModalOptions): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay:not(.kawa-confirm-overlay)');
  if (existing) existing.remove();

  let currentSpeed = options.typewriterSpeed;
  let currentDelay = options.autoDelayMs;
  let currentMusic = options.musicVolume ?? 0.8;
  let currentSound = options.soundVolume ?? 1.0;
  let currentDyslexia = options.dyslexiaFont ?? false;
  let currentHighContrast = options.highContrast ?? false;
  let currentLang = options.currentLang ?? 'en';

  const overlay = document.createElement('div');
  overlay.className = 'kawa-modal-overlay';

  const card = document.createElement('div');
  card.className = 'kawa-modal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', 'Preferences / Settings');

  const header = document.createElement('div');
  header.className = 'kawa-modal-header';

  const title = document.createElement('div');
  title.className = 'kawa-modal-title';
  title.innerHTML = `${SVG_ICONS.settings} <span>Preferences & Accessibility</span>`;

  const releaseFocus = trapFocus(card);
  const close = (): void => {
    releaseFocus();
    overlay.remove();
  };

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close settings');
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body';

  const notifyChange = () => {
    options.onSettingsChange({
      typewriterSpeed: currentSpeed,
      autoDelayMs: currentDelay,
      musicVolume: currentMusic,
      soundVolume: currentSound,
      dyslexiaFont: currentDyslexia,
      highContrast: currentHighContrast,
      lang: currentLang
    });
  };

  // 1. Text Speed
  const speedRow = document.createElement('div');
  speedRow.className = 'kawa-setting-row';
  speedRow.innerHTML = `
    <div class="kawa-setting-header">
      <span>Text Display Speed</span>
      <span class="kawa-setting-value" id="kawa-speed-val">${currentSpeed === 0 ? 'Instant' : `${currentSpeed}ms`}</span>
    </div>
    <input type="range" class="kawa-slider" id="kawa-speed-slider" min="0" max="60" step="5" value="${currentSpeed}">
  `;
  const speedInput = speedRow.querySelector('#kawa-speed-slider') as HTMLInputElement;
  const speedValEl = speedRow.querySelector('#kawa-speed-val') as HTMLElement;
  speedInput.addEventListener('input', () => {
    currentSpeed = Number(speedInput.value);
    speedValEl.textContent = currentSpeed === 0 ? 'Instant' : `${currentSpeed}ms`;
    notifyChange();
  });

  // 2. Auto Forward Delay
  const autoRow = document.createElement('div');
  autoRow.className = 'kawa-setting-row';
  const autoVal = (currentDelay / 1000).toFixed(1);
  autoRow.innerHTML = `
    <div class="kawa-setting-header">
      <span>Auto-Forward Time</span>
      <span class="kawa-setting-value" id="kawa-auto-val">${autoVal}s</span>
    </div>
    <input type="range" class="kawa-slider" id="kawa-auto-slider" min="500" max="5000" step="250" value="${currentDelay}">
  `;
  const autoInput = autoRow.querySelector('#kawa-auto-slider') as HTMLInputElement;
  const autoValEl = autoRow.querySelector('#kawa-auto-val') as HTMLElement;
  autoInput.addEventListener('input', () => {
    currentDelay = Number(autoInput.value);
    autoValEl.textContent = `${(currentDelay / 1000).toFixed(1)}s`;
    notifyChange();
  });

  // 3. Audio Volume Sliders
  const musicRow = document.createElement('div');
  musicRow.className = 'kawa-setting-row';
  const musicPercent = Math.round(currentMusic * 100);
  musicRow.innerHTML = `
    <div class="kawa-setting-header">
      <span>${SVG_ICONS.volumeOn} Music Volume</span>
      <span class="kawa-setting-value" id="kawa-music-val">${musicPercent}%</span>
    </div>
    <input type="range" class="kawa-slider" id="kawa-music-slider" min="0" max="100" step="5" value="${musicPercent}">
  `;
  const musicInput = musicRow.querySelector('#kawa-music-slider') as HTMLInputElement;
  const musicValEl = musicRow.querySelector('#kawa-music-val') as HTMLElement;
  musicInput.addEventListener('input', () => {
    currentMusic = Number(musicInput.value) / 100;
    musicValEl.textContent = `${musicInput.value}%`;
    notifyChange();
  });

  const sfxRow = document.createElement('div');
  sfxRow.className = 'kawa-setting-row';
  const sfxPercent = Math.round(currentSound * 100);
  sfxRow.innerHTML = `
    <div class="kawa-setting-header">
      <span>${SVG_ICONS.volumeOn} Sound & Voice Volume</span>
      <span class="kawa-setting-value" id="kawa-sfx-val">${sfxPercent}%</span>
    </div>
    <input type="range" class="kawa-slider" id="kawa-sfx-slider" min="0" max="100" step="5" value="${sfxPercent}">
  `;
  const sfxInput = sfxRow.querySelector('#kawa-sfx-slider') as HTMLInputElement;
  const sfxValEl = sfxRow.querySelector('#kawa-sfx-val') as HTMLElement;
  sfxInput.addEventListener('input', () => {
    currentSound = Number(sfxInput.value) / 100;
    sfxValEl.textContent = `${sfxInput.value}%`;
    notifyChange();
  });

  // 4. Accessibility Options
  const a11ySection = document.createElement('div');
  a11ySection.className = 'kawa-setting-section';
  a11ySection.innerHTML = `
    <div class="kawa-setting-section-title">♿ Accessibility</div>
    <label class="kawa-toggle-label">
      <input type="checkbox" id="kawa-dyslexia-toggle" ${currentDyslexia ? 'checked' : ''}>
      <span>Dyslexia-Friendly Font (High Readability)</span>
    </label>
    <label class="kawa-toggle-label">
      <input type="checkbox" id="kawa-contrast-toggle" ${currentHighContrast ? 'checked' : ''}>
      <span>High Contrast Mode (Sharp Text & Borders)</span>
    </label>
  `;

  const dyslexiaInput = a11ySection.querySelector('#kawa-dyslexia-toggle') as HTMLInputElement;
  dyslexiaInput.addEventListener('change', () => {
    currentDyslexia = dyslexiaInput.checked;
    notifyChange();
  });

  const contrastInput = a11ySection.querySelector('#kawa-contrast-toggle') as HTMLInputElement;
  contrastInput.addEventListener('change', () => {
    currentHighContrast = contrastInput.checked;
    notifyChange();
  });

  // 5. Language Selector (if available)
  if (options.availableLangs && options.availableLangs.length > 1) {
    const langRow = document.createElement('div');
    langRow.className = 'kawa-setting-row';
    const langOptionsHtml = options.availableLangs
      .map((l) => {
        const safeValue = escapeHtml(l);
        const safeLabel = escapeHtml(l.toUpperCase());
        return `<option value="${safeValue}" ${l === currentLang ? 'selected' : ''}>${safeLabel}</option>`;
      })
      .join('');
    langRow.innerHTML = `
      <div class="kawa-setting-header">
        <span>🌐 Language / Lingua</span>
      </div>
      <select class="kawa-select" id="kawa-lang-select">
        ${langOptionsHtml}
      </select>
    `;
    const langSelect = langRow.querySelector('#kawa-lang-select') as HTMLSelectElement;
    langSelect.addEventListener('change', () => {
      currentLang = langSelect.value;
      notifyChange();
    });
    body.appendChild(langRow);
  }

  body.appendChild(speedRow);
  body.appendChild(autoRow);
  body.appendChild(musicRow);
  body.appendChild(sfxRow);
  body.appendChild(a11ySection);

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}
