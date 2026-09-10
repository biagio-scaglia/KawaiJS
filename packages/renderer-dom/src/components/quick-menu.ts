import { SVG_ICONS } from '../icons.js';

export interface QuickMenuCallbacks {
  onTitle: () => void;
  onBack: () => void;
  onHistory: () => void;
  onAuto: () => void;
  onSkip: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSettings: () => void;
}

export class QuickMenuComponent {
  public readonly el: HTMLElement;
  public readonly titleBtn: HTMLButtonElement;
  public readonly backBtn: HTMLButtonElement;
  public readonly autoBtn: HTMLButtonElement;
  public readonly skipBtn: HTMLButtonElement;

  constructor(callbacks: QuickMenuCallbacks) {
    this.el = document.createElement('nav');
    this.el.className = 'kawa-quick-menu';
    this.el.setAttribute('role', 'toolbar');
    this.el.setAttribute('aria-label', 'Quick Actions');

    this.titleBtn = document.createElement('button');
    this.titleBtn.className = 'kawa-btn';
    this.titleBtn.innerHTML = `${SVG_ICONS.home} <span>Title</span>`;
    this.titleBtn.setAttribute('aria-label', 'Return to Title Screen');
    this.titleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onTitle();
    });

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'kawa-btn';
    this.backBtn.innerHTML = `${SVG_ICONS.back} <span>Back</span>`;
    this.backBtn.setAttribute('aria-label', 'Rollback to previous dialogue');
    this.backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onBack();
    });

    const histBtn = document.createElement('button');
    histBtn.className = 'kawa-btn';
    histBtn.innerHTML = `${SVG_ICONS.history} <span>History</span>`;
    histBtn.setAttribute('aria-label', 'Open dialogue history log');
    histBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onHistory();
    });

    this.autoBtn = document.createElement('button');
    this.autoBtn.className = 'kawa-btn';
    this.autoBtn.innerHTML = `${SVG_ICONS.auto} <span>Auto</span>`;
    this.autoBtn.setAttribute('aria-label', 'Toggle Auto Forward Mode');
    this.autoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onAuto();
    });

    this.skipBtn = document.createElement('button');
    this.skipBtn.className = 'kawa-btn';
    this.skipBtn.innerHTML = `${SVG_ICONS.skip} <span>Skip</span>`;
    this.skipBtn.setAttribute('aria-label', 'Toggle Fast Forward Skip Mode');
    this.skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSkip();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'kawa-btn';
    saveBtn.innerHTML = `${SVG_ICONS.save} <span>Save</span>`;
    saveBtn.setAttribute('aria-label', 'Open save game menu');
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSave();
    });

    const loadBtn = document.createElement('button');
    loadBtn.className = 'kawa-btn';
    loadBtn.innerHTML = `${SVG_ICONS.load} <span>Load</span>`;
    loadBtn.setAttribute('aria-label', 'Open load game menu');
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onLoad();
    });

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'kawa-btn';
    settingsBtn.innerHTML = `${SVG_ICONS.settings} <span>Settings</span>`;
    settingsBtn.setAttribute('aria-label', 'Open Settings Menu');
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onSettings();
    });

    this.el.appendChild(this.titleBtn);
    this.el.appendChild(this.backBtn);
    this.el.appendChild(histBtn);
    this.el.appendChild(this.autoBtn);
    this.el.appendChild(this.skipBtn);
    this.el.appendChild(saveBtn);
    this.el.appendChild(loadBtn);
    this.el.appendChild(settingsBtn);
  }

  public setBackDisabled(disabled: boolean): void {
    this.backBtn.disabled = disabled;
  }

  public setAutoActive(active: boolean): void {
    this.autoBtn.classList.toggle('active', active);
  }

  public setSkipActive(active: boolean): void {
    this.skipBtn.classList.toggle('active', active);
  }
}
