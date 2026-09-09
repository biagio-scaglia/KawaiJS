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
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

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
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

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
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

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
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

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
    expect(modal?.querySelectorAll('.kawa-slot-card').length).toBe(6);

    // Close save modal
    (modal?.querySelector('.kawa-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.kawa-modal-overlay')).toBeNull();

    renderer.destroy();
  });

  it('triggers screen shake and flash animations', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

    renderer.shakeScreen();
    const stage = container.querySelector('.kawa-stage');
    expect(stage?.classList.contains('kawa-shake')).toBe(true);

    renderer.flashScreen();
    const flash = container.querySelector('.kawa-flash-overlay');
    expect(flash).not.toBeNull();

    renderer.destroy();
  });

  it('cleans up DOM and listeners on destroy', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, typewriterSpeed: 0 });

    renderer.destroy();
    expect(container.innerHTML).toBe('');
  });
});
