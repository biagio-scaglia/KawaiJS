// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '@kawaijs/runtime';
import { DOMRenderer } from '../src/renderer.js';

describe('DOMRenderer Component & Accessibility', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  const sampleScript = `character yumia "Yumia" #f43f5e
character kaori "Kaori" #0284c7

label start:
    scene bg classroom with fade
    show yumia happy at left
    show kaori normal at right
    yumia "Hello from DOM Renderer!"

    menu:
        "Choice 1":
            yumia "You picked 1"
        "Choice 2":
            kaori "You picked 2"
`;

  it('mounts and renders initial stage, background, and character sprites', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0, mainMenu: { enabled: false } });

    vm.start();

    // Verify stage structure
    const stage = container.querySelector('.kawa-stage') as HTMLElement;
    expect(stage).not.toBeNull();
    expect(stage.getAttribute('role')).toBe('main');

    // Verify background
    const bg = container.querySelector('.kawa-background') as HTMLElement;
    expect(bg).not.toBeNull();
    expect(bg.dataset.transition).toBe('fade');

    // Verify character sprites
    const sprites = container.querySelectorAll('.kawa-sprite');
    expect(sprites.length).toBe(2);

    const yumiaSprite = container.querySelector('.kawa-sprite[data-character="yumia"]') as HTMLElement;
    expect(yumiaSprite).not.toBeNull();
    expect(yumiaSprite.classList.contains('kawa-pos-left')).toBe(true);
    expect(yumiaSprite.dataset.expression).toBe('happy');

    const kaoriSprite = container.querySelector('.kawa-sprite[data-character="kaori"]') as HTMLElement;
    expect(kaoriSprite).not.toBeNull();
    expect(kaoriSprite.classList.contains('kawa-pos-right')).toBe(true);

    renderer.destroy();
  });

  it('renders dialogue, speaker tag with color, and accessibility attributes', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0, mainMenu: { enabled: false } });

    vm.start();

    const dialogueBox = container.querySelector('.kawa-dialogue-box') as HTMLElement;
    expect(dialogueBox.getAttribute('role')).toBe('region');
    expect(dialogueBox.getAttribute('aria-label')).toBe('Dialogue');

    const speakerTag = container.querySelector('.kawa-speaker-tag') as HTMLElement;
    expect(speakerTag.textContent).toBe('Yumia');
    expect(speakerTag.style.backgroundColor).toBe('#f43f5e');

    const dialogueText = container.querySelector('.kawa-dialogue-text') as HTMLElement;
    expect(dialogueText.getAttribute('aria-live')).toBe('polite');
    expect(dialogueText.textContent).toBe('Hello from DOM Renderer!');

    renderer.destroy();
  });

  it('renders interactive choice menu and dispatches choice selection', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0, mainMenu: { enabled: false } });

    vm.start(); // at dialogue
    vm.next();  // at menu

    const choicesContainer = container.querySelector('.kawa-choice-container') as HTMLElement;
    expect(choicesContainer.style.display).toBe('flex');

    const choiceBtns = choicesContainer.querySelectorAll('.kawa-choice-btn');
    expect(choiceBtns.length).toBe(2);
    expect(choiceBtns[0]?.textContent).toBe('Choice 1');
    expect(choiceBtns[1]?.textContent).toBe('Choice 2');

    // Click Choice 2
    (choiceBtns[1] as HTMLButtonElement).click();

    expect(vm.getState().dialogue?.text).toBe('You picked 2');
    expect(vm.getState().dialogue?.speaker).toBe('kaori');

    renderer.destroy();
  });

  it('supports modal display for save/load and dialogue history', async () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0, mainMenu: { enabled: false } });

    vm.start();

    // Show History Modal
    renderer.showHistoryModal();
    let modal = container.querySelector('.kawa-modal-overlay');
    expect(modal).not.toBeNull();
    const modalTitle = modal?.querySelector('.kawa-modal-title');
    expect(modalTitle?.textContent).toContain('Dialogue History');

    // Close modal
    (modal?.querySelector('.kawa-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.kawa-modal-overlay')).toBeNull();

    // Show Save Modal
    await renderer.showSaveLoadModal('save');
    modal = container.querySelector('.kawa-modal-overlay');
    expect(modal).not.toBeNull();
    const slotCards = modal?.querySelectorAll('.kawa-slot-card')!;
    expect(slotCards.length).toBe(6);

    // Verify empty slot card elements and icons (no emojis)
    const firstEmptyCard = slotCards[0];
    expect(firstEmptyCard.classList.contains('kawa-slot-empty')).toBe(true);
    expect(firstEmptyCard.querySelector('.kawa-slot-badge')?.innerHTML).toContain('svg');
    expect(firstEmptyCard.querySelector('.kawa-slot-badge')?.textContent).toContain('Slot 1');
    expect(firstEmptyCard.querySelector('.kawa-slot-time')?.textContent).toBe('Empty');
    expect(firstEmptyCard.querySelector('.kawa-slot-empty-content')).not.toBeNull();
    expect(firstEmptyCard.querySelector('.kawa-slot-btn-save')?.textContent).toContain('Save Here');

    // Click Save Here on Slot 1
    (firstEmptyCard.querySelector('.kawa-slot-btn-save') as HTMLButtonElement).click();
    await new Promise(r => setTimeout(r, 50));

    // Re-open Save Modal and check occupied state
    await renderer.showSaveLoadModal('save');
    modal = container.querySelector('.kawa-modal-overlay');
    const updatedCards = modal?.querySelectorAll('.kawa-slot-card')!;
    const savedCard = updatedCards[0];
    expect(savedCard.classList.contains('kawa-slot-occupied')).toBe(true);
    expect(savedCard.querySelector('.kawa-slot-badge')?.classList.contains('kawa-slot-badge-occupied')).toBe(true);
    expect(savedCard.querySelector('.kawa-slot-time')?.innerHTML).toContain('svg'); // Clock icon
    expect(savedCard.querySelector('.kawa-slot-preview')).not.toBeNull();
    expect(savedCard.querySelector('.kawa-slot-preview-icon')?.innerHTML).toContain('svg'); // Quote icon
    expect(savedCard.querySelector('.kawa-slot-btn-save')?.textContent).toContain('Overwrite');
    expect(savedCard.querySelector('.kawa-slot-btn-del')?.innerHTML).toContain('svg'); // Trash icon

    // Close save modal
    (modal?.querySelector('.kawa-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.kawa-modal-overlay')).toBeNull();

    renderer.destroy();
  });

  it('triggers screen shake and flash animations', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0, mainMenu: { enabled: false } });

    renderer.shakeScreen();
    const stage = container.querySelector('.kawa-stage');
    expect(stage?.classList.contains('kawa-shake')).toBe(true);

    renderer.flashScreen();
    const flash = container.querySelector('.kawa-flash-overlay');
    expect(flash).not.toBeNull();

    renderer.destroy();
  });

  it('supports customizable Start / Main Menu and transition to story', async () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    let startCallbackFired = false;

    const renderer = new DOMRenderer(vm, {
      container,
      typewriterSpeed: 0,
      mainMenu: {
        enabled: true,
        title: 'Custom Novel Title',
        subtitle: 'By Kawaijs Creator',
        customFooter: 'Test Footer Info',
        onStart: () => {
          startCallbackFired = true;
        }
      }
    });

    // Main Menu should be rendered and visible
    expect(renderer.isMainMenuActive()).toBe(true);
    const mainMenuEl = container.querySelector('.kawa-main-menu') as HTMLElement;
    expect(mainMenuEl).not.toBeNull();
    expect(mainMenuEl.style.display).toBe('flex');

    const titleEl = container.querySelector('.kawa-main-menu-title');
    expect(titleEl?.textContent).toBe('Custom Novel Title');

    const subEl = container.querySelector('.kawa-main-menu-subtitle');
    expect(subEl?.textContent).toBe('By Kawaijs Creator');

    const footerEl = container.querySelector('.kawa-main-menu-footer');
    expect(footerEl?.textContent).toBe('Test Footer Info');

    // Click "About" button from Main Menu
    const aboutBtn = container.querySelector('.kawa-main-menu-btn[data-action="about"]') as HTMLButtonElement;
    expect(aboutBtn).not.toBeNull();
    aboutBtn.click();

    const aboutModal = container.querySelector('.kawa-about-card');
    expect(aboutModal).not.toBeNull();
    expect(aboutModal?.textContent).toContain('Custom Novel Title');

    // Close about modal
    (container.querySelector('.kawa-about-card .kawa-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.kawa-about-card')).toBeNull();

    // Click "Start Game"
    const startBtn = container.querySelector('.kawa-main-menu-btn[data-action="start"]') as HTMLButtonElement;
    expect(startBtn).not.toBeNull();
    startBtn.click();

    expect(startCallbackFired).toBe(true);
    expect(renderer.isMainMenuActive()).toBe(false);
    expect(mainMenuEl.style.display).toBe('none');

    // VM is now playing the dialogue
    const dialogueBox = container.querySelector('.kawa-dialogue-box') as HTMLElement;
    expect(dialogueBox.textContent).toContain('Hello from DOM Renderer!');

    // Test returning to title screen via Quick Menu Title button
    const titleBtn = container.querySelector('.kawa-quick-menu button[aria-label="Return to Title Screen"]') as HTMLButtonElement;
    expect(titleBtn).not.toBeNull();
    titleBtn.click();

    expect(renderer.isMainMenuActive()).toBe(true);
    expect(mainMenuEl.style.display).toBe('flex');

    renderer.destroy();
  });

  it('renders default Ren\'Py menu items (Start, Continue, Load, Preferences, About, Quit) and handles Quit', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    let quitFired = false;

    const renderer = new DOMRenderer(vm, {
      container,
      typewriterSpeed: 0,
      mainMenu: {
        onQuit: () => {
          quitFired = true;
        }
      }
    });

    expect(renderer.isMainMenuActive()).toBe(true);

    const buttons = container.querySelectorAll('.kawa-main-menu-btn');
    const buttonActions = Array.from(buttons).map(b => b.getAttribute('data-action'));
    expect(buttonActions).toEqual(['start', 'continue', 'load', 'settings', 'about', 'quit']);

    // Test Quit button
    const quitBtn = container.querySelector('.kawa-main-menu-btn[data-action="quit"]') as HTMLButtonElement;
    expect(quitBtn).not.toBeNull();
    quitBtn.click();
    expect(quitFired).toBe(true);

    renderer.destroy();
  });

  it('cleans up DOM and listeners on destroy', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

    renderer.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('sanitizes rich text markup against XSS and quotes', () => {
    const xssScript = `label start:
    "Test" "{b}bold{/b} <script>alert(1)</script> \\"quoted\\" {color=red}colored{/color}"
`;
    const story = compileScript(xssScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0, mainMenu: { enabled: false } });

    vm.start();
    const dialogueText = container.querySelector('.kawa-dialogue-text') as HTMLElement;
    expect(dialogueText.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(dialogueText.innerHTML).toContain('"quoted"');
    expect(dialogueText.innerHTML).toContain('<strong class="kawa-bold">bold</strong>');
    expect(dialogueText.innerHTML).toContain('style="color:red"');
    expect(container.querySelector('script')).toBeNull();

    renderer.destroy();
  });

  it('implements responsive layout contract with ViewportAdapter', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, {
      container,
      mainMenu: { enabled: false },
      virtualCanvas: { width: 1920, height: 1080, scaleMode: 'contain' }
    });

    const adapter = renderer.getViewportAdapter();
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const metrics = adapter.getMetrics();
    expect(metrics.virtualWidth).toBe(1920);
    expect(metrics.virtualHeight).toBe(1080);
    expect(metrics.scale).toBeGreaterThan(0);

    // Story coordinates -> Virtual Canvas -> Stage Pixels
    const centerVirtual = adapter.storyToVirtual(0.5, 0.5);
    expect(centerVirtual).toEqual({ x: 960, y: 540 });

    const centerPixels = adapter.storyToStagePixels(0.5, 0.5);
    expect(centerPixels.px).toBe(Math.round(960 * metrics.scale));
    expect(centerPixels.py).toBe(Math.round(540 * metrics.scale));

    const stage = container.querySelector('.kawa-stage') as HTMLElement;
    expect(stage.style.getPropertyValue('--kawa-virtual-width')).toBe('1920px');
    expect(stage.style.getPropertyValue('--kawa-virtual-height')).toBe('1080px');

    renderer.destroy();
  });
});



