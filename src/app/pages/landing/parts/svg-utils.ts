export function escapeHtml(s: string) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function impactTreeToHtml(nodes: any[], escapeFn: (s: string) => string): string {
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return '<div>(no impact tree)</div>';
  const renderNode = (n: any): string => {
    const title = escapeFn(n.title ?? n.name ?? n.key ?? '');
    const sub = n.subtitle ? `<div class="node-sub">${escapeFn(n.subtitle)}</div>` : '';
    const details: string[] = [];
    if (n.impactType) details.push(escapeFn(n.impactType));
    if (typeof n.risk !== 'undefined' && n.risk !== null) details.push('Risk: ' + escapeFn(n.risk));
    const meta = details.length ? `<div class="node-sub">${escapeFn(details.join(' — '))}</div>` : '';
    let childrenHtml = '';
    if (n.children && Array.isArray(n.children) && n.children.length) {
      childrenHtml = '<ul>' + n.children.map((c: any) => renderNode(c)).join('') + '</ul>';
    }
    return `<li><strong>${title}</strong>${sub}${meta}${childrenHtml}</li>`;
  };
  return '<ul>' + nodes.map((n) => renderNode(n)).join('') + '</ul>';
}

export function serializeSvgWithInlineStyles(svgEl: SVGElement | null): string {
  try {
    if (!svgEl) return '';
    const clone = svgEl.cloneNode(true) as SVGElement;
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const originalEls = Array.from(svgEl.querySelectorAll('*')) as Element[];
    const cloneEls = Array.from(clone.querySelectorAll('*')) as Element[];

    const props = [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'stroke-dasharray',
      'stroke-opacity',
      'fill-opacity',
      'opacity',
      'font-size',
      'font-family',
      'font-weight',
      'text-anchor',
      'dominant-baseline',
      'color',
      'display',
      'visibility',
      'transform',
      'background-color',
    ];

    for (let i = 0; i < cloneEls.length; i++) {
      const orig = originalEls[i];
      const c = cloneEls[i];
      if (!orig || !c) continue;
      try {
        const cs = window.getComputedStyle(orig as Element);
        let styleText = c.getAttribute('style') || '';
        for (const p of props) {
          try {
            const v = cs.getPropertyValue(p);
            if (v && v !== 'none' && v !== 'normal' && v !== '0px') {
              if (!new RegExp(`${p}\s*:`).test(styleText)) styleText += `${p}:${v};`;
            }
          } catch (e) {
            /* ignore */
          }
        }
        if (styleText) c.setAttribute('style', styleText);
      } catch (e) {
        /* ignore node errors */
      }
    }

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);
    if (!svgString.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return svgString;
  } catch (e) {
    try {
      const serializer = new XMLSerializer();
      return svgEl ? serializer.serializeToString(svgEl) : '';
    } catch (er) {
      return '';
    }
  }
}
