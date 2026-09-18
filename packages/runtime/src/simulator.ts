import type { StoryPackage } from '@kawaijs/ast';
import { StoryVM } from './vm.js';
import type { StoryState } from './state.js';

export interface SimulationChoiceStep {
  selectedIndex: number;
  selectedText: string;
}

export interface SimulationEnding {
  choicePath: SimulationChoiceStep[];
  visitedLabels: string[];
  finalState: StoryState;
}

export interface SimulationError {
  choicePath: SimulationChoiceStep[];
  lastLabel: string;
  error: string;
}

export interface StorySimulationResult {
  totalPaths: number;
  visitedLabels: Set<string>;
  unreachableLabels: string[];
  endings: SimulationEnding[];
  errors: SimulationError[];
}

export interface SimulateStoryOptions {
  startLabel?: string;
  maxStepsPerPath?: number;
  initialVariables?: Record<string, any>;
}

/**
 * Headless Story Simulator & Branching Path Explorer.
 * Traverses all branching choices in a story graph to detect dead-ends,
 * unreachable labels, syntax/runtime evaluation crashes, and story completion.
 */
export function simulateStory(story: StoryPackage, options: SimulateStoryOptions = {}): StorySimulationResult {
  const maxSteps = options.maxStepsPerPath ?? 1000;
  const startLabel = options.startLabel ?? 'start';
  const visitedLabels = new Set<string>();
  const endings: SimulationEnding[] = [];
  const errors: SimulationError[] = [];

  let totalPaths = 0;

  interface QueueItem {
    choicePath: SimulationChoiceStep[];
    choiceIndicesToTake: number[];
  }

  const queue: QueueItem[] = [
    { choicePath: [], choiceIndicesToTake: [] }
  ];

  const processedDecisionTrees = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift()!;
    const pathKey = item.choiceIndicesToTake.join('->');
    if (processedDecisionTrees.has(pathKey)) continue;
    processedDecisionTrees.add(pathKey);

    const vm = new StoryVM(story, {
      initialVariables: options.initialVariables ? { ...options.initialVariables } : undefined
    });

    let hasError = false;
    let errorMessage = '';
    vm.onError((err) => {
      hasError = true;
      errorMessage = err.message;
    });

    try {
      vm.start(startLabel);
    } catch (err: any) {
      errors.push({
        choicePath: [],
        lastLabel: startLabel,
        error: err?.message ?? String(err)
      });
      continue;
    }

    const pathVisitedLabels: string[] = [];
    const recordedChoices: SimulationChoiceStep[] = [];
    let choiceCursor = 0;
    let stepCount = 0;

    while (stepCount < maxSteps) {
      stepCount++;
      const state = vm.getState();

      if (state.currentLabel && !pathVisitedLabels.includes(state.currentLabel)) {
        pathVisitedLabels.push(state.currentLabel);
        visitedLabels.add(state.currentLabel);
      }

      if (hasError) {
        errors.push({
          choicePath: [...recordedChoices],
          lastLabel: state.currentLabel,
          error: errorMessage || 'Unknown runtime error during simulation'
        });
        break;
      }

      if (state.isFinished) {
        totalPaths++;
        endings.push({
          choicePath: [...recordedChoices],
          visitedLabels: pathVisitedLabels,
          finalState: { ...state }
        });
        break;
      }

      if (state.choices && state.choices.length > 0) {
        const availableChoices = state.choices;
        if (choiceCursor < item.choiceIndicesToTake.length) {
          const chosenIdx = item.choiceIndicesToTake[choiceCursor]!;
          const chosenOption = availableChoices[chosenIdx] ?? availableChoices[0]!;
          recordedChoices.push({
            selectedIndex: chosenIdx,
            selectedText: chosenOption.text
          });
          choiceCursor++;
          vm.choose(chosenIdx);
        } else {
          // Fork into all available choice paths
          for (let i = 0; i < availableChoices.length; i++) {
            const nextIndices = [...item.choiceIndicesToTake, i];
            queue.push({
              choicePath: [...recordedChoices],
              choiceIndicesToTake: nextIndices
            });
          }
          break;
        }
      } else if (state.hotspots && state.hotspots.length > 0) {
        // Fork into each hotspot path (same exploration model as choices).
        if (choiceCursor < item.choiceIndicesToTake.length) {
          const chosenIdx = item.choiceIndicesToTake[choiceCursor]!;
          const hotspot = state.hotspots[chosenIdx] ?? state.hotspots[0]!;
          recordedChoices.push({
            selectedIndex: chosenIdx,
            selectedText: `hotspot:${hotspot.id}`
          });
          choiceCursor++;
          vm.selectHotspot(hotspot.id);
        } else {
          for (let i = 0; i < state.hotspots.length; i++) {
            queue.push({
              choicePath: [...recordedChoices],
              choiceIndicesToTake: [...item.choiceIndicesToTake, i]
            });
          }
          break;
        }
      } else if (state.pendingInput) {
        // Deterministic placeholder so input prompts do not soft-lock the explorer.
        vm.submitInput('sim');
      } else {
        vm.next();
      }
    }

    if (stepCount >= maxSteps && !vm.getState().isFinished && !hasError) {
      errors.push({
        choicePath: [...recordedChoices],
        lastLabel: vm.getState().currentLabel,
        error: `Simulation reached maximum step limit (${maxSteps}) without completing (possible infinite loop)`
      });
    }
  }

  const allStoryLabels = Object.keys(story.labels ?? {});
  const unreachableLabels = allStoryLabels.filter((label) => !visitedLabels.has(label));

  return {
    totalPaths,
    visitedLabels,
    unreachableLabels,
    endings,
    errors
  };
}
