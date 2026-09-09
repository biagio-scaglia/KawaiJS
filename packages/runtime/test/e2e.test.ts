import { describe, it, expect } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '../src/vm.js';

describe('Canonical End-to-End Story Pipeline Smoke Test', () => {
  const storySource = `# Canonical Kawaijs Test Story
character yumia "Yumia" #f43f5e
character kaori "Kaori" #0284c7

label start:
    set affection = 0
    set dev_skill = 0

    scene bg classroom with fade
    show yumia happy at left
    show kaori normal at right

    yumia "Welcome to the school club!"
    kaori "Are you ready to build the new visual novel engine?"

    menu:
        "Yes, let's write high-performance code!":
            set dev_skill += 2
            show kaori happy at right
            kaori "Great enthusiasm! Let's head to the rooftop."
            jump tech_branch

        "I want to focus on romance and art!":
            set affection += 2
            show yumia excited at left
            yumia "Yay! Let's go to the courtyard!"
            jump romance_branch

label tech_branch:
    scene bg rooftop with fade
    show kaori happy at center
    kaori "Look at the skyline. Clean code leads to great games."
    jump evaluate_path

label romance_branch:
    scene bg courtyard with fade
    show yumia excited at center
    yumia "The cherry blossoms are blooming!"
    jump evaluate_path

label evaluate_path:
    if dev_skill >= 2:
        jump tech_ending
    else:
        jump romance_ending

label tech_ending:
    scene bg rooftop
    kaori "Congratulations! You completed the Developer route."
    narrator "Ending 1: The Master Architect."
    return

label romance_ending:
    scene bg courtyard
    yumia "Congratulations! You completed the Romance route."
    narrator "Ending 2: The Beloved Storyteller."
    return
`;

  it('verifies the entire 10-step canonical visual novel flow', () => {
    // 1. Story loads and compiles into deterministic IR
    const story = compileScript(storySource, 'e2e_story.kawa');
    expect(story.meta.startLabel).toBe('start');
    expect(story.characters['yumia']?.color).toBe('#f43f5e');
    expect(story.characters['kaori']?.color).toBe('#0284c7');

    const vm = new StoryVM(story);

    // 2. First scene initializes
    vm.start();
    const state1 = vm.getState();
    expect(state1.visual.background).toBe('bg classroom');
    expect(state1.visual.transition).toBe('fade');
    expect(state1.visual.characters['yumia']?.expression).toBe('happy');
    expect(state1.visual.characters['yumia']?.position).toBe('left');
    expect(state1.visual.characters['kaori']?.expression).toBe('normal');
    expect(state1.visual.characters['kaori']?.position).toBe('right');

    // 3. Dialogue appears
    expect(state1.dialogue?.speaker).toBe('yumia');
    expect(state1.dialogue?.speakerDisplayName).toBe('Yumia');
    expect(state1.dialogue?.speakerColor).toBe('#f43f5e');
    expect(state1.dialogue?.text).toBe('Welcome to the school club!');
    expect(state1.isWaitingForInput).toBe(true);

    // 4. User interaction advances dialogue
    vm.next();
    const state2 = vm.getState();
    expect(state2.dialogue?.speaker).toBe('kaori');
    expect(state2.dialogue?.speakerDisplayName).toBe('Kaori');
    expect(state2.dialogue?.text).toBe('Are you ready to build the new visual novel engine?');

    // 5. Menu appears with choices
    vm.next();
    const state3 = vm.getState();
    expect(state3.choices).toBeDefined();
    expect(state3.choices?.length).toBe(2);
    expect(state3.choices?.[0]?.text).toBe("Yes, let's write high-performance code!");
    expect(state3.choices?.[1]?.text).toBe("I want to focus on romance and art!");

    // 6. Choice changes story path (Choose Option 0: Developer route)
    vm.choose(0);
    const state4 = vm.getState();
    expect(state4.choices).toBeNull();
    expect(state4.dialogue?.speaker).toBe('kaori');
    expect(state4.dialogue?.text).toBe("Great enthusiasm! Let's head to the rooftop.");

    // 7. Variables change
    expect(state4.variables['dev_skill']).toBe(2);
    expect(state4.variables['affection']).toBe(0);

    // 8. Condition changes resulting branch & Visual state updates to rooftop
    vm.next();
    const state5 = vm.getState();
    expect(state5.visual.background).toBe('bg rooftop');
    expect(state5.visual.characters['kaori']?.expression).toBe('happy');
    expect(state5.visual.characters['kaori']?.position).toBe('center');
    expect(state5.dialogue?.text).toBe('Look at the skyline. Clean code leads to great games.');

    // 9. Advances through conditional jump to ending
    vm.next();
    const state6 = vm.getState();
    expect(state6.dialogue?.text).toBe('Congratulations! You completed the Developer route.');

    vm.next();
    const state7 = vm.getState();
    expect(state7.dialogue?.speaker).toBeUndefined(); // Narrator
    expect(state7.dialogue?.text).toBe('Ending 1: The Master Architect.');

    // 10. Story reaches deterministic ending
    vm.next();
    const stateFinal = vm.getState();
    expect(stateFinal.isFinished).toBe(true);
    expect(stateFinal.isWaitingForInput).toBe(false);
  });

  it('verifies alternative branching, variable conditions, and rollback', () => {
    const story = compileScript(storySource, 'e2e_story.kawa');
    const vm = new StoryVM(story);

    vm.start();
    vm.next(); // At Kaori dialogue
    vm.next(); // At Menu

    // Choose Romance Branch (Option 1)
    vm.choose(1);
    expect(vm.getState().variables['affection']).toBe(2);
    expect(vm.getState().dialogue?.text).toBe('Yay! Let\'s go to the courtyard!');

    // Test Rollback: step back to before choice
    expect(vm.canRollback()).toBe(true);
    const rollbackSuccess = vm.rollback();
    expect(rollbackSuccess).toBe(true);
    expect(vm.getState().choices?.length).toBe(2);

    // Now re-choose Romance branch and complete story to Romance ending
    vm.choose(1);
    vm.next(); // In courtyard scene
    expect(vm.getState().visual.background).toBe('bg courtyard');
    expect(vm.getState().dialogue?.text).toBe('The cherry blossoms are blooming!');

    vm.next(); // In romance ending
    expect(vm.getState().dialogue?.text).toBe('Congratulations! You completed the Romance route.');

    vm.next(); // Narrator
    expect(vm.getState().dialogue?.text).toBe('Ending 2: The Beloved Storyteller.');

    vm.next(); // Finished
    expect(vm.getState().isFinished).toBe(true);
  });
});
