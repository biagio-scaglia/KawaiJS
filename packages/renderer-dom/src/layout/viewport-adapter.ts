export interface VirtualCanvasConfig {
  readonly width: number;
  readonly height: number;
  readonly scaleMode: 'contain' | 'cover' | 'stretch';
}

export interface ViewportMetrics {
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly virtualWidth: number;
  readonly virtualHeight: number;
  readonly stageWidth: number;
  readonly stageHeight: number;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Layout Contract Implementation:
 * Story coordinates -> Virtual canvas (1920x1080) -> Viewport adapter -> DOM layout
 *
 * Ensures scene semantics, positioning, and visual composition remain completely
 * decoupled from physical screen and browser dimensions.
 */
export class ViewportAdapter {
  private readonly container: HTMLElement;
  private readonly stageEl: HTMLElement;
  private readonly config: VirtualCanvasConfig;
  private resizeObserver?: ResizeObserver;
  private windowResizeListener?: () => void;
  private currentMetrics: ViewportMetrics;

  constructor(container: HTMLElement, stageEl: HTMLElement, config?: Partial<VirtualCanvasConfig>) {
    this.container = container;
    this.stageEl = stageEl;
    this.config = {
      width: config?.width ?? 1920,
      height: config?.height ?? 1080,
      scaleMode: config?.scaleMode ?? 'contain'
    };

    this.currentMetrics = this.computeMetrics();
    this.applyMetrics();
    this.initObserver();
  }

  public computeMetrics(): ViewportMetrics {
    const containerRect = this.container.getBoundingClientRect();
    // Don't invent a wider stage than the host — a 320px floor caused horizontal clip in narrow panes.
    const rawW = containerRect.width;
    const rawH = containerRect.height;
    const containerWidth = rawW > 1 ? rawW : 320;
    const containerHeight = rawH > 1 ? rawH : 180;

    const { width: virtualWidth, height: virtualHeight, scaleMode } = this.config;

    let scale = 1;
    let stageWidth = virtualWidth;
    let stageHeight = virtualHeight;

    // Portrait phones: letterboxed 16:9 shrinks the whole UI (menu included) to ~220px.
    // Fill the viewport so Start / dialogue remain tappable — but never inside embeds
    // (playground / iframe): fill + background-size:cover crops the scene sideways.
    const inEmbed =
      typeof this.stageEl.closest === 'function' &&
      Boolean(this.stageEl.closest('.kawa-embed'));
    const isPortrait = containerHeight > containerWidth * 1.05;
    const preferFill =
      !inEmbed &&
      isPortrait &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(max-width: 900px)').matches ||
        window.matchMedia('(pointer: coarse)').matches);

    if (preferFill && scaleMode !== 'stretch') {
      stageWidth = Math.round(containerWidth);
      stageHeight = Math.round(containerHeight);
      // Fit virtual width; extra vertical space is usable UI chrome.
      scale = stageWidth / virtualWidth;
    } else if (scaleMode === 'contain') {
      const scaleX = containerWidth / virtualWidth;
      const scaleY = containerHeight / virtualHeight;
      scale = Math.min(scaleX, scaleY);
      stageWidth = Math.round(virtualWidth * scale);
      stageHeight = Math.round(virtualHeight * scale);
    } else if (scaleMode === 'cover') {
      const scaleX = containerWidth / virtualWidth;
      const scaleY = containerHeight / virtualHeight;
      scale = Math.max(scaleX, scaleY);
      stageWidth = Math.round(virtualWidth * scale);
      stageHeight = Math.round(virtualHeight * scale);
    } else {
      // stretch
      stageWidth = containerWidth;
      stageHeight = containerHeight;
      scale = containerWidth / virtualWidth;
    }

    const offsetX = Math.max(0, Math.round((containerWidth - stageWidth) / 2));
    const offsetY = Math.max(0, Math.round((containerHeight - stageHeight) / 2));

    return {
      containerWidth,
      containerHeight,
      virtualWidth,
      virtualHeight,
      stageWidth,
      stageHeight,
      scale,
      offsetX,
      offsetY
    };
  }

  public applyMetrics(): void {
    const m = this.computeMetrics();
    this.currentMetrics = m;

    this.stageEl.style.setProperty('--kawa-virtual-width', `${m.virtualWidth}px`);
    this.stageEl.style.setProperty('--kawa-virtual-height', `${m.virtualHeight}px`);
    this.stageEl.style.setProperty('--kawa-stage-width', `${m.stageWidth}px`);
    this.stageEl.style.setProperty('--kawa-stage-height', `${m.stageHeight}px`);
    this.stageEl.style.setProperty('--kawa-stage-scale', `${m.scale}`);

    this.stageEl.style.width = `${m.stageWidth}px`;
    this.stageEl.style.height = `${m.stageHeight}px`;
  }

  /**
   * Translates story coordinates (normalized 0..1) to virtual canvas coordinates.
   */
  public storyToVirtual(normX: number, normY: number): { x: number; y: number } {
    return {
      x: normX * this.config.width,
      y: normY * this.config.height
    };
  }

  /**
   * Translates story coordinates directly to stage pixels.
   */
  public storyToStagePixels(normX: number, normY: number): { px: number; py: number } {
    const virt = this.storyToVirtual(normX, normY);
    return {
      px: Math.round(virt.x * this.currentMetrics.scale),
      py: Math.round(virt.y * this.currentMetrics.scale)
    };
  }

  public getMetrics(): ViewportMetrics {
    return this.currentMetrics;
  }

  private initObserver(): void {
    let raf = 0;
    const schedule = (): void => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        this.applyMetrics();
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        schedule();
      });
      this.resizeObserver.observe(this.container);
    } else if (typeof window !== 'undefined') {
      this.windowResizeListener = () => schedule();
      window.addEventListener('resize', this.windowResizeListener, { passive: true });
    }
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.windowResizeListener && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.windowResizeListener);
    }
  }
}
