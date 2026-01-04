// public/scripts/RenderQueue.ts
import { renderGameState, showCardEvent, renderPlayedCards } from './render.js';
import { Card, GameStateData } from '../../src/shared/types.js';

type TaskType = 'ANIMATION' | 'STATE_UPDATE';

interface QueueTask {
  type: TaskType;
  execute: () => Promise<void>;
}

export class RenderQueue {
  private queue: QueueTask[] = [];
  private isProcessing = false;
  private lastVisualOverride: Card | null = null;
  private myPlayerId: string | null = null;

  public setPlayerId(id: string | null) {
    this.myPlayerId = id;
  }

  /**
   * Clears the visual override (e.g., when pile is picked up)
   */
  public clearVisualOverride() {
    this.lastVisualOverride = null;
  }

  /**
   * Queue an animation. This BLOCKS the render loop until finished.
   */
  public enqueueAnimation(
    cards: Card[],
    effectType: string,
    effectValue: string | number | null,
    durationMs: number
  ) {
    this.queue.push({
      type: 'ANIMATION',
      execute: async () => {
        console.log(`[Queue] Playing Animation: ${effectType}`);

        // 1. Snapshot the card we are animating (e.g., the 5)
        if (cards && cards.length > 0) {
          this.lastVisualOverride = cards[cards.length - 1];
        }

        // 2. Render the "Throw" immediately
        renderPlayedCards(cards);

        // 3. Trigger the Icon Popup (slight delay for DOM to settle)
        setTimeout(() => {
          showCardEvent(effectValue, effectType);
        }, 50);

        // 4. BLOCK here for the duration. No state updates allowed yet.
        await new Promise<void>((resolve) => setTimeout(resolve, durationMs));

        console.log('[Queue] Animation Finished');
      },
    });

    this.processNext();
  }

  /**
   * Queue a state update. This waits for animations to finish.
   */
  public enqueueStateUpdate(newState: GameStateData) {
    this.queue.push({
      type: 'STATE_UPDATE',
      execute: async () => {
        console.log('[Queue] Rendering State Update');

        // If pile is empty (Burn), clear the visual override
        if (newState.pile.length === 0) {
          this.lastVisualOverride = null;
        }

        // Render with the override (keeps the 5 visible if it was a Copy)
        renderGameState(newState, this.myPlayerId, this.lastVisualOverride);
      },
    });

    this.processNext();
  }

  private async processNext() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift();

    if (task) {
      try {
        await task.execute();
      } catch (err) {
        console.error('[Queue] Task Error:', err);
      }
    }

    this.isProcessing = false;
    this.processNext();
  }
}

export const renderQueue = new RenderQueue();
