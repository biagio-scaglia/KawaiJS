// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '@kawaijs/runtime';
import { DOMRenderer } from '../src/renderer.js';
import { mountKawaApp, resolveDeepLinkLabel } from '../src/index.js';
import { resolveEmbedMode } from '../src/embed.js';
import {
  buildSceneShareMeta,
  stripRichTags
} from '../src/share-meta.js';
import { DialogueBoxComponent } from '../src/components/dialogue-box.js';
import { ChoiceMenuComponent } from '../src/components/choice-menu.js';
import { characterAssetCandidates, defaultAssetResolver } from '../src/renderer.js';

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

  it('prefers raster character assets before default svg', () => {
    expect(characterAssetCandidates('hero/normal', defaultAssetResolver)).toEqual([
      'assets/characters/hero/normal.png',
      'assets/characters/hero/normal.jpg',
      'assets/characters/hero/normal.jpeg',
      'assets/characters/hero/normal.webp',
      'assets/characters/hero/normal.svg'
    ]);
    expect(characterAssetCandidates('hero.jpg', defaultAssetResolver)[0]).toBe(
      'assets/characters/hero.jpg'
    );
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
    expect(dialogueText.getAttribute('aria-hidden')).toBe('true');
    expect(dialogueText.getAttribute('aria-live')).toBeNull();
    expect(dialogueText.textContent).toBe('Hello from DOM Renderer!');

    const announce = container.querySelector('.kawa-dialogue-announce') as HTMLElement;
    expect(announce.getAttribute('aria-live')).toBe('polite');
    expect(announce.textContent).toContain('Hello from DOM Renderer!');

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
    expect(startBtn.type).toBe('button');
    expect(startBtn.id).toBe('kawa-menu-start');
    startBtn.click();

    expect(startCallbackFired).toBe(true);
    expect(renderer.isMainMenuActive()).toBe(false);
    expect(mainMenuEl.style.display).toBe('none');

    // VM is now playing the dialogue — must NOT bounce back to main menu
    const dialogueBox = container.querySelector('.kawa-dialogue-box') as HTMLElement;
    expect(dialogueBox.textContent).toContain('Hello from DOM Renderer!');
    expect(renderer.isMainMenuActive()).toBe(false);

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
    expect(buttonActions).toEqual(['start', 'continue', 'load', 'achievements', 'settings', 'about', 'quit']);

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
    "{b}bold{/b} <script>alert(1)</script> \\"quoted\\" {color=red}colored{/color}"
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

  it('renders VFX layer and CG illustration, and opens CG Gallery modal', () => {
    const vfxScript = `label start:
    vfx rain
    cg "event_cg_1.jpg" as "cg_1"
    "Look at the CG!"
`;
    const story = compileScript(vfxScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, {
      container,
      mainMenu: {
        enabled: true,
        galleryItems: [
          { id: 'cg_1', title: 'Rainy Day Meeting', image: 'event_cg_1.jpg' }
        ]
      }
    });

    // Verify Gallery button is present in Main Menu when galleryItems are provided
    const galleryBtn = container.querySelector('.kawa-main-menu-btn[data-action="gallery"]') as HTMLButtonElement;
    expect(galleryBtn).not.toBeNull();
    expect(galleryBtn.textContent).toContain('CG Gallery');

    // Click Gallery button to open modal
    galleryBtn.click();
    let modal = container.querySelector('.kawa-modal-overlay');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('.kawa-modal-title')?.textContent).toContain('CG & Event Gallery');

    // Close modal
    (modal?.querySelector('.kawa-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.kawa-modal-overlay')).toBeNull();

    // Start story and verify VFX & CG elements
    renderer.startNewGame();
    const vfxLayer = container.querySelector('.kawa-vfx-layer');
    expect(vfxLayer).not.toBeNull();

    const cgLayer = container.querySelector('.kawa-cg-layer') as HTMLElement;
    expect(cgLayer).not.toBeNull();
    expect(cgLayer.style.display).toBe('block');

    renderer.destroy();
  });

  it('handles audio playback events (play music, play sound, stop music) via AudioManager', () => {
    const audioScript = `label start:
    play music "theme" fade 2 loop
    play sound "bell"
    "Music playing!"
    stop music fade 1
    "Music stopped."
`;
    const story = compileScript(audioScript);
    const vm = new StoryVM(story);

    const playedMusic: Array<{ src: string; options?: unknown }> = [];
    const playedSounds: string[] = [];
    let stoppedMusic = false;

    const mockAudioManager = {
      playMusic: (src: string, options?: unknown) => {
        playedMusic.push({ src, options });
      },
      playSound: (src: string) => {
        playedSounds.push(src);
      },
      stopMusic: () => {
        stoppedMusic = true;
      },
      setMusicVolume: () => {},
      setSoundVolume: () => {}
    };

    const renderer = new DOMRenderer(vm, {
      container,
      audioManager: mockAudioManager,
      mainMenu: { enabled: false }
    });

    vm.start();
    expect(playedMusic.length).toBe(1);
    expect(playedMusic[0]?.src).toContain('assets/audio/theme.mp3');
    expect(playedSounds.length).toBe(1);
    expect(playedSounds[0]).toContain('assets/audio/bell.mp3');

    vm.next();
    expect(stoppedMusic).toBe(true);

    renderer.destroy();
  });

  it('escapes error toast messages against XSS', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, mainMenu: { enabled: false }, typewriterSpeed: 0 });

    renderer.showErrorToast('<img src=x onerror=alert(1)>');
    const toast = container.querySelector('.kawa-error-toast-msg');
    expect(toast?.innerHTML).toContain('&lt;img');
    expect(toast?.querySelector('img')).toBeNull();

    renderer.destroy();
  });

  it('supports custom dialogue/choice component factories and hides quick menu', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);

    let dialogueCreated = false;
    let choiceCreated = false;

    const renderer = new DOMRenderer(vm, {
      container,
      mainMenu: { enabled: false },
      typewriterSpeed: 0,
      features: { quickMenu: false },
      components: {
        createDialogueBox: (speed) => {
          dialogueCreated = true;
          return new DialogueBoxComponent(speed);
        },
        createChoiceMenu: (cb) => {
          choiceCreated = true;
          return new ChoiceMenuComponent(cb);
        }
      }
    });

    expect(dialogueCreated).toBe(true);
    expect(choiceCreated).toBe(true);
    expect((container.querySelector('.kawa-quick-menu') as HTMLElement)?.style.display).toBe('none');

    renderer.destroy();
  });

  it('debounces advance after finishing typewriter text', () => {
    const story = compileScript(`label start:
    "Hello world this is long enough"
    "Second"
`);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, {
      container,
      mainMenu: { enabled: false },
      typewriterSpeed: 50,
      features: { advanceDebounceMs: 500 }
    });

    vm.start();
    const stage = container.querySelector('.kawa-stage') as HTMLElement;
    stage.click(); // finish typewriter
    expect(vm.getState().dialogue?.text).toContain('Hello');
    stage.click(); // should be ignored due to debounce
    expect(vm.getState().dialogue?.text).toContain('Hello');

    renderer.destroy();
  });

  it('is safe to call destroy twice', () => {
    const story = compileScript(sampleScript);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, mainMenu: { enabled: false }, typewriterSpeed: 0 });
    renderer.destroy();
    expect(() => renderer.destroy()).not.toThrow();
    expect(container.innerHTML).toBe('');
  });

  it('applies theme/style tokens and renders hotspot buttons', () => {
    const story = compileScript(`label start:
    theme "noir"
    style dialogue glass
    hotspot door 10 20 30 40 jump next
    "blocked"

label next:
    "ok"
`);
    const vm = new StoryVM(story);
    const renderer = new DOMRenderer(vm, { container, mainMenu: { enabled: false }, typewriterSpeed: 0 });
    vm.start();

    const root = container.querySelector('.kawa-root') as HTMLElement;
    expect(root.dataset.kawaTheme).toBe('noir');
    expect(root.classList.contains('kawa-style-dialogue-glass')).toBe(true);
    const spots = container.querySelectorAll('.kawa-hotspot');
    expect(spots.length).toBe(1);
    (spots[0] as HTMLButtonElement).click();
    expect(vm.getState().dialogue?.text).toBe('ok');
    renderer.destroy();
  });

  it('resolves deep-link labels and ignores internal ones', () => {
    const story = compileScript(`label start:
    "a"
label courtyard:
    "b"
label __secret:
    "c"
`);
    expect(resolveDeepLinkLabel(story, { startLabel: 'courtyard' })).toBe('courtyard');
    expect(resolveDeepLinkLabel(story, { search: '?at=courtyard' })).toBe('courtyard');
    expect(resolveDeepLinkLabel(story, { search: '?label=__secret' })).toBeUndefined();
    expect(resolveDeepLinkLabel(story, { search: '?at=missing' })).toBeUndefined();
  });

  it('detects embed mode and mounts without main menu chrome', () => {
    expect(resolveEmbedMode('?embed=1')).toBe(true);
    expect(resolveEmbedMode('?embed=true')).toBe(true);
    expect(resolveEmbedMode('?embed=0')).toBe(false);

    const story = compileScript(`label start:
    "Hello embed"
`);
    const { renderer, vm } = mountKawaApp(story, container, {
      search: '?embed=1',
      typewriterSpeed: 0,
      mainMenu: { enabled: true, title: 'Should hide' }
    });

    expect(vm.getState().dialogue?.text).toBe('Hello embed');
    const root = container.querySelector('.kawa-root') as HTMLElement;
    expect(root.classList.contains('kawa-embed')).toBe(true);
    expect(root.dataset.kawaEmbed).toBe('1');
    const quick = container.querySelector('.kawa-quick-menu') as HTMLElement;
    expect(quick.style.display).toBe('none');
    renderer.destroy();
  });

  it('restores progress from a continue-link query param', async () => {
    const story = compileScript(`character yumia "Yumia" #f43f5e
label start:
    yumia "First"
    yumia "Second"
`);
    const prep = new StoryVM(story);
    prep.start();
    prep.next();
    const slot = await prep.save('1');
    const { encodeContinueToken } = await import('@kawaijs/runtime');
    const token = encodeContinueToken(slot)!;

    const { renderer, vm } = mountKawaApp(story, container, {
      search: `?continue=${token}`,
      typewriterSpeed: 0,
      mainMenu: { enabled: true }
    });

    expect(vm.getState().dialogue?.text).toBe('Second');
    expect(container.querySelector('.kawa-main-menu.active')).toBeNull();
    renderer.destroy();
  });

  it('builds scene share meta from dialogue and label overrides', () => {
    expect(stripRichTags('{b}Hi{/b} [name]')).toBe('Hi');

    const story = compileScript(`character yumia "Yumia" #f43f5e
label start:
    yumia "Hello from {b}Kawaijs{/b}!"
label courtyard:
    "Under the trees"
`);
    const vm = new StoryVM(story);
    vm.start();
    const meta = buildSceneShareMeta(story, vm.getState(), {
      siteName: 'Demo VN',
      labels: {
        start: { title: 'Opening', description: 'Custom blurb' }
      }
    });
    expect(meta.title).toBe('Opening');
    expect(meta.description).toBe('Custom blurb');
  });
});




