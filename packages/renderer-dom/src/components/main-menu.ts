import type { StoryVM } from '@kawaijs/runtime';
import { SVG_ICONS } from '../icons.js';
import type { MainMenuItem, MainMenuOptions, AssetType } from '../types.js';
import { showSaveLoadModal } from '../modals/save-load-modal.js';
import { showSettingsModal } from '../modals/settings-modal.js';
import { showAboutModal } from '../modals/about-modal.js';
import { showConfirmModal } from '../modals/confirm-modal.js';

export interface MainMenuComponentCallbacks {
  onStartNewGame: () => void;
  onContinueGame: () => Promise<boolean>;
  assetResolver: (path: string, type: AssetType) => string;
  getSettingsConfig: () => { typewriterSpeed: number; autoDelayMs: number; onSettingsChange: (s: { typewriterSpeed: number; autoDelayMs: number }) => void };
}

export class MainMenuComponent {
  private readonly vm: StoryVM;
  private readonly rootEl: HTMLElement;
  private readonly options?: MainMenuOptions;
  private readonly callbacks: MainMenuComponentCallbacks;

  private menuEl?: HTMLDivElement;
  private isVisible = false;

  constructor(rootEl: HTMLElement, vm: StoryVM, options: MainMenuOptions | undefined, callbacks: MainMenuComponentCallbacks) {
    this.rootEl = rootEl;
    this.vm = vm;
    this.options = options;
    this.callbacks = callbacks;
  }

  public mount(container: HTMLElement): void {
    if (!this.menuEl) {
      this.buildDOM();
    }
    if (this.menuEl) {
      container.appendChild(this.menuEl);
    }
  }

  public show(): void {
    if (!this.menuEl) {
      this.buildDOM();
    }
    if (!this.menuEl) return;

    this.isVisible = true;
    this.refresh();
    this.menuEl.style.display = 'flex';
    this.menuEl.classList.add('active');

    this.options?.onOpen?.();
  }

  public hide(): void {
    if (!this.menuEl) return;
    this.isVisible = false;
    this.menuEl.classList.remove('active');
    this.menuEl.style.display = 'none';
    this.options?.onClose?.();
  }

  public isActive(): boolean {
    return this.isVisible;
  }

  public refresh(): void {
    if (!this.menuEl) return;
    // Check if saves exist to enable/disable the "Continue" button
    const continueBtn = this.menuEl.querySelector('button[data-action="continue"]');
    if (continueBtn) {
      void this.vm.getSaveManager().listSlots(6).then((slots) => {
        const hasSaves = slots.some((s) => s !== null);
        if (!hasSaves) {
          continueBtn.classList.add('disabled');
          continueBtn.setAttribute('aria-disabled', 'true');
        } else {
          continueBtn.classList.remove('disabled');
          continueBtn.removeAttribute('aria-disabled');
        }
      });
    }
  }

  public getDefaultMenuItems(): MainMenuItem[] {
    return [
      {
        id: 'start',
        label: 'Start Game',
        icon: SVG_ICONS.play,
        action: 'start'
      },
      {
        id: 'continue',
        label: 'Continue',
        icon: SVG_ICONS.auto,
        action: 'continue'
      },
      {
        id: 'load',
        label: 'Load Game',
        icon: SVG_ICONS.load,
        action: 'load'
      },
      {
        id: 'settings',
        label: 'Preferences',
        icon: SVG_ICONS.settings,
        action: 'settings'
      },
      {
        id: 'about',
        label: 'About',
        icon: SVG_ICONS.info,
        action: 'about'
      },
      {
        id: 'quit',
        label: 'Quit',
        icon: SVG_ICONS.power,
        action: 'quit'
      }
    ];
  }

  private buildDOM(): void {
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'kawa-main-menu';
    this.menuEl.setAttribute('role', 'region');
    this.menuEl.setAttribute('aria-label', 'Main Menu');
    this.menuEl.style.display = 'none';

    if (this.options?.backgroundUrl) {
      const bgUrl = this.callbacks.assetResolver(this.options.backgroundUrl, 'background');
      this.menuEl.style.backgroundImage = `url("${bgUrl}")`;
      this.menuEl.style.backgroundSize = 'cover';
      this.menuEl.style.backgroundPosition = 'center';
    }

    const backdropEl = document.createElement('div');
    backdropEl.className = 'kawa-main-menu-backdrop';

    const contentEl = document.createElement('div');
    contentEl.className = 'kawa-main-menu-content';

    const headerEl = document.createElement('div');
    headerEl.className = 'kawa-main-menu-header';

    if (this.options?.logoUrl) {
      const logoEl = document.createElement('img');
      logoEl.className = 'kawa-main-menu-logo';
      logoEl.src = this.callbacks.assetResolver(this.options.logoUrl, 'background');
      logoEl.alt = 'Logo';
      headerEl.appendChild(logoEl);
    }

    const titleEl = document.createElement('h1');
    titleEl.className = 'kawa-main-menu-title';
    titleEl.textContent = this.options?.title || 'Kawaijs Visual Novel';
    headerEl.appendChild(titleEl);

    if (this.options?.subtitle) {
      const subEl = document.createElement('div');
      subEl.className = 'kawa-main-menu-subtitle';
      subEl.textContent = this.options.subtitle;
      headerEl.appendChild(subEl);
    }

    const navEl = document.createElement('nav');
    navEl.className = 'kawa-main-menu-nav';
    navEl.setAttribute('role', 'navigation');

    const items = this.options?.items ?? this.getDefaultMenuItems();

    for (const item of items) {
      if (item.condition && !item.condition()) continue;

      const btn = document.createElement('button');
      btn.className = `kawa-main-menu-btn ${item.className || ''}`.trim();
      btn.setAttribute('data-action', typeof item.action === 'string' ? item.action : 'custom');
      if (item.id) btn.id = item.id;
      btn.innerHTML = `${item.icon ? item.icon + ' ' : ''}<span>${item.label}</span>`;

      if (item.action === 'continue') {
        void this.vm.getSaveManager().listSlots(6).then((slots) => {
          const hasSaves = slots.some((s) => s !== null);
          if (!hasSaves) {
            btn.classList.add('disabled');
            btn.setAttribute('aria-disabled', 'true');
          }
        });
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('disabled')) return;

        if (item.action === 'start') {
          this.callbacks.onStartNewGame();
          this.hide();
        } else if (item.action === 'continue') {
          void this.callbacks.onContinueGame().then((ok) => {
            if (ok) this.hide();
          });
        } else if (item.action === 'load') {
          void showSaveLoadModal(this.rootEl, this.vm, 'load', () => {
            this.hide();
          });
        } else if (item.action === 'settings') {
          showSettingsModal(this.rootEl, this.callbacks.getSettingsConfig());
        } else if (item.action === 'about') {
          showAboutModal(this.rootEl, this.options);
        } else if (item.action === 'quit') {
          if (this.options?.onQuit) {
            this.options.onQuit();
          } else {
            showConfirmModal(this.rootEl, {
              title: 'Quit Visual Novel',
              message: 'Are you sure you want to quit?',
              confirmText: 'Quit',
              cancelText: 'Cancel',
              onConfirm: () => {
                if (typeof window !== 'undefined') {
                  window.close();
                }
              }
            });
          }
        } else if (typeof item.action === 'function') {
          item.action();
        }
      });

      navEl.appendChild(btn);
    }

    const footerEl = document.createElement('footer');
    footerEl.className = 'kawa-main-menu-footer';
    footerEl.innerHTML = this.options?.customFooter || '🌸 Powered by Kawaijs Engine';

    contentEl.appendChild(headerEl);
    contentEl.appendChild(navEl);
    contentEl.appendChild(footerEl);

    this.menuEl.appendChild(backdropEl);
    this.menuEl.appendChild(contentEl);
  }
}
