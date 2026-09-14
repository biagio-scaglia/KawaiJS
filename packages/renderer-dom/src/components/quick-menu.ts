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

function wireButton(
  btn: HTMLButtonElement,
  html: string,
  ariaLabel: string,
  onClick: () => void
): void {
  btn.type = 'button';
  btn.className = 'kawa-btn';
  btn.innerHTML = html;
  btn.setAttribute('aria-label', ariaLabel);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
}

export class QuickMenuComponent {
  public readonly el: HTMLElement;
  public readonly titleBtn: HTMLButtonElement;
  public readonly backBtn: HTMLButtonElement;
  public readonly autoBtn: HTMLButtonElement;
  public readonly skipBtn: HTMLButtonElement;

  constructor(callbacks: QuickMenuCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'kawa-quick-menu';
    this.el.setAttribute('role', 'toolbar');
    this.el.setAttribute('aria-label', 'Quick Actions');

    this.titleBtn = document.createElement('button');
    wireButton(this.titleBtn, `${SVG_ICONS.home} <span>Title</span>`, 'Return to Title Screen', callbacks.onTitle);

    this.backBtn = document.createElement('button');
    wireButton(this.backBtn, `${SVG_ICONS.back} <span>Back</span>`, 'Rollback to previous dialogue', callbacks.onBack);

    const histBtn = document.createElement('button');
    wireButton(histBtn, `${SVG_ICONS.history} <span>History</span>`, 'Open dialogue history log', callbacks.onHistory);

    this.autoBtn = document.createElement('button');
    wireButton(this.autoBtn, `${SVG_ICONS.auto} <span>Auto</span>`, 'Toggle Auto Forward Mode', callbacks.onAuto);

    this.skipBtn = document.createElement('button');
    wireButton(this.skipBtn, `${SVG_ICONS.skip} <span>Skip</span>`, 'Toggle Fast Forward Skip Mode', callbacks.onSkip);

    const saveBtn = document.createElement('button');
    wireButton(saveBtn, `${SVG_ICONS.save} <span>Save</span>`, 'Open save game menu', callbacks.onSave);

    const loadBtn = document.createElement('button');
    wireButton(loadBtn, `${SVG_ICONS.load} <span>Load</span>`, 'Open load game menu', callbacks.onLoad);

    const settingsBtn = document.createElement('button');
    wireButton(settingsBtn, `${SVG_ICONS.settings} <span>Settings</span>`, 'Open Settings Menu', callbacks.onSettings);

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
