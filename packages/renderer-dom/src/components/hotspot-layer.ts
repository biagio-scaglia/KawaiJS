import type { HotspotOption } from '@kawaijs/ast';

/**
 * Absolute-positioned clickable regions over the stage / CG.
 * Coordinates are normalized 0–1 relative to the stage.
 */
export class HotspotLayerComponent {
  public readonly el: HTMLDivElement;

  constructor(private readonly onSelect: (id: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'kawa-hotspot-layer';
    this.el.setAttribute('aria-label', 'Interactive regions');
    this.el.style.display = 'none';
  }

  public render(hotspots: readonly HotspotOption[] | null | undefined): void {
    this.el.replaceChildren();

    if (!hotspots || hotspots.length === 0) {
      this.el.style.display = 'none';
      this.el.setAttribute('aria-hidden', 'true');
      return;
    }

    this.el.style.display = 'block';
    this.el.setAttribute('aria-hidden', 'false');

    for (const spot of hotspots) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kawa-hotspot';
      btn.dataset.hotspotId = spot.id;
      btn.setAttribute('aria-label', spot.id);
      btn.title = spot.id;
      btn.style.left = `${spot.x * 100}%`;
      btn.style.top = `${spot.y * 100}%`;
      btn.style.width = `${spot.w * 100}%`;
      btn.style.height = `${spot.h * 100}%`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelect(spot.id);
      });
      this.el.appendChild(btn);
    }
  }

  public destroy(): void {
    this.el.replaceChildren();
    this.el.remove();
  }
}
