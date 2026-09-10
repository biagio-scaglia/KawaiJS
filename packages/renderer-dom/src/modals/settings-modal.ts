import { SVG_ICONS } from '../icons.js';

export interface SettingsModalOptions {
  typewriterSpeed: number;
  autoDelayMs: number;
  onSettingsChange: (settings: { typewriterSpeed: number; autoDelayMs: number }) => void;
}

export function showSettingsModal(rootEl: HTMLElement, options: SettingsModalOptions): void {
  const existing = rootEl.querySelector('.kawa-modal-overlay');
  if (existing) existing.remove();

  let currentSpeed = options.typewriterSpeed;
  let currentDelay = options.autoDelayMs;

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
  title.innerHTML = `${SVG_ICONS.settings} <span>Preferences</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'kawa-btn';
  closeBtn.innerHTML = `${SVG_ICONS.close} <span>Close</span>`;
  closeBtn.setAttribute('aria-label', 'Close settings');
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'kawa-modal-body';

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
    options.onSettingsChange({ typewriterSpeed: currentSpeed, autoDelayMs: currentDelay });
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
    options.onSettingsChange({ typewriterSpeed: currentSpeed, autoDelayMs: currentDelay });
  });

  // 3. Audio Volume Sliders
  const musicRow = document.createElement('div');
  musicRow.className = 'kawa-setting-row';
  musicRow.innerHTML = `
    <div class="kawa-setting-header">
      <span>${SVG_ICONS.volumeOn} Music Volume</span>
      <span class="kawa-setting-value" id="kawa-music-val">80%</span>
    </div>
    <input type="range" class="kawa-slider" id="kawa-music-slider" min="0" max="100" step="5" value="80">
  `;

  const sfxRow = document.createElement('div');
  sfxRow.className = 'kawa-setting-row';
  sfxRow.innerHTML = `
    <div class="kawa-setting-header">
      <span>${SVG_ICONS.volumeOn} Sound & Voice Volume</span>
      <span class="kawa-setting-value" id="kawa-sfx-val">100%</span>
    </div>
    <input type="range" class="kawa-slider" id="kawa-sfx-slider" min="0" max="100" step="5" value="100">
  `;

  body.appendChild(speedRow);
  body.appendChild(autoRow);
  body.appendChild(musicRow);
  body.appendChild(sfxRow);

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  rootEl.appendChild(overlay);
}
