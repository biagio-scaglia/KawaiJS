import { describe, it, expect } from 'vitest';
import { compileScript } from '@kawaijs/parser';
import { StoryVM, interpolateVariables, resolveSpriteZ } from '../src/index.js';

describe('layers, animate, unlock, lang', () => {
  it('parses show z/layer and applies z-index state', () => {
    const story = compileScript(`character yumia "Yumia"
label start:
    layer overlay
    show yumia happy at left z 5
    yumia "hi"
`);
    const show = story.labels.start!.find((i) => i.type === 'show');
    expect(show).toMatchObject({ type: 'show', z: 5 });
    const layer = story.labels.start!.find((i) => i.type === 'layer');
    expect(layer).toMatchObject({ type: 'layer', name: 'overlay' });

    const vm = new StoryVM(story);
    vm.start();
    // execute until dialogue waits — layer+show already ran
    const yumia = vm.getState().visual.characters['yumia'];
    expect(yumia?.z).toBe(5);
    expect(yumia?.layer).toBe('overlay');
    expect(resolveSpriteZ('overlay', undefined)).toBe(30);
  });

  it('runs animate and unlock + lang / i18n interpolation', () => {
    const base = compileScript(`character yumia "Yumia"
label start:
    show yumia at center
    animate yumia with "slide-in 400ms"
    unlock first_end "First Ending" "You made it"
    lang "it"
    yumia "{t:hello}"
`);
    const story = {
      ...base,
      i18n: {
        it: { hello: 'Ciao!' },
        en: { hello: 'Hello!' }
      }
    };
    const vm = new StoryVM(story);
    vm.start();
    const anim = vm.getState().visual.characters['yumia']?.cssAnimation;
    expect(anim?.name).toBe('slide-in');
    expect(anim?.durationMs).toBe(400);
    expect(vm.getState().achievements['first_end']?.title).toBe('First Ending');
    expect(vm.getState().lang).toBe('it');
    expect(vm.getState().dialogue?.text).toBe('Ciao!');

    const exported = vm.exportAchievementsJson();
    expect(exported.achievements.some((a) => a.id === 'first_end')).toBe(true);

    expect(
      interpolateVariables('{t:hello}', {}, { lang: 'en', i18n: story.i18n })
    ).toBe('Hello!');
  });
});
