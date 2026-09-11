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
    const containerWidth = Math.max(containerRect.width, 320);
    const containerHeight = Math.max(containerRect.height, 180);

    const { width: virtualWidth, height: virtualHeight, scaleMode } = this.config;

    let scale = 1;
    let stageWidth = virtualWidth;
    let stageHeight = virtualHeight;

    if (scaleMode === 'contain') {
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
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.applyMetrics();
      });
      this.resizeObserver.observe(this.container);
    } else if (typeof window !== 'undefined') {
      this.windowResizeListener = () => this.applyMetrics();
      window.addEventListener('resize', this.windowResizeListener);
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
