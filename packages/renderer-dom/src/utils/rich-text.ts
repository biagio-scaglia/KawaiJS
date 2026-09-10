/**
 * Parses inline rich text markup: {b}...{/b}, {i}...{/i}, {color=#hex}...{/color}, {size=1.2em}...{/size}
 */
export function formatRichText(raw: string): string {
  let formatted = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // {b}...{/b}
  formatted = formatted.replace(/\{b\}(.*?)\{\/b\}/gi, '<strong class="kawa-bold">$1</strong>');
  // {i}...{/i}
  formatted = formatted.replace(/\{i\}(.*?)\{\/i\}/gi, '<em class="kawa-italic">$1</em>');
  // {color=#hex}...{/color}
  formatted = formatted.replace(/\{color=([^}]+)\}(.*?)\{\/color\}/gi, '<span style="color:$1">$2</span>');
  // {size=1.2em}...{/size}
  formatted = formatted.replace(/\{size=([^}]+)\}(.*?)\{\/size\}/gi, '<span style="font-size:$1">$2</span>');

  return formatted;
}
