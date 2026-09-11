/**
 * Parses inline rich text markup: {b}...{/b}, {i}...{/i}, {color=#hex}...{/color}, {size=1.2em}...{/size}
 * Includes sanitization against attribute injection and XSS.
 */
export function formatRichText(raw: string): string {
  let formatted = (raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // {b}...{/b}
  formatted = formatted.replace(/\{b\}(.*?)\{\/b\}/gi, '<strong class="kawa-bold">$1</strong>');
  // {i}...{/i}
  formatted = formatted.replace(/\{i\}(.*?)\{\/i\}/gi, '<em class="kawa-italic">$1</em>');
  // {color=#hex|name}...{/color}
  formatted = formatted.replace(/\{color=([#a-zA-Z0-9_().,\s-]+)\}(.*?)\{\/color\}/gi, (_match, colorVal, inner) => {
    const cleanColor = colorVal.replace(/[^#a-zA-Z0-9_().,\s-]/g, '').trim();
    return `<span style="color:${cleanColor}">${inner}</span>`;
  });
  // {size=1.2em}...{/size}
  formatted = formatted.replace(/\{size=([0-9.]+(?:px|em|rem|%|vw|vh)?)\}(.*?)\{\/size\}/gi, (_match, sizeVal, inner) => {
    const cleanSize = sizeVal.replace(/[^0-9.a-z%]/gi, '').trim();
    return `<span style="font-size:${cleanSize}">${inner}</span>`;
  });

  return formatted;
}
