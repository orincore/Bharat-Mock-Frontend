const fs = require('fs');
const file = './src/components/PageEditor/BlockEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. handleEditorPaste
code = code.replace(
  `        ADD_ATTR: ['style', 'class', 'colspan', 'rowspan', 'border', 'cellpadding', 'cellspacing',
          'xmlns', 'display', 'mathvariant', 'mathsize', 'stretchy', 'fence', 'separator',
          'lspace', 'rspace', 'linethickness', 'numalign', 'denomalign', 'bevelled',
          'columnalign', 'rowalign', 'columnspacing', 'rowspacing', 'displaystyle',
          'scriptlevel', 'notation', 'encoding',
        ],
        FORBID_ATTR: ['color', 'face'],
      });

      // Strip color/font-size from all non-MathML elements
      tmp.querySelectorAll('*').forEach(el => {
        if (el.namespaceURI === 'http://www.w3.org/1998/Math/MathML') return;
        const s = (el as HTMLElement).style;
        if (s) {
          s.removeProperty('color');
          s.removeProperty('background-color');
          s.removeProperty('font-size');
          s.removeProperty('font-family');
          if (!s.cssText.trim()) (el as HTMLElement).removeAttribute('style');
        }
        el.removeAttribute('color');
        el.removeAttribute('face');
      });`,
  `        ADD_ATTR: ['style', 'class', 'colspan', 'rowspan', 'border', 'cellpadding', 'cellspacing',
          'xmlns', 'display', 'mathvariant', 'mathsize', 'stretchy', 'fence', 'separator',
          'lspace', 'rspace', 'linethickness', 'numalign', 'denomalign', 'bevelled',
          'columnalign', 'rowalign', 'columnspacing', 'rowspacing', 'displaystyle',
          'scriptlevel', 'notation', 'encoding', 'color', 'face', 'size'
        ]
      });`
);

// 2. handleCellPaste
code = code.replace(
  `      const tmp = document.createElement('div');
      tmp.innerHTML = DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['b', 'strong', 'i', 'em', 'u', 'sub', 'sup', 'code'],
        FORBID_ATTR: ['style', 'class', 'color', 'face', 'size'],
      });
      // Remove any remaining style attributes
      tmp.querySelectorAll('*').forEach(el => {
        el.removeAttribute('style');
        el.removeAttribute('class');
      });
      document.execCommand('insertHTML', false, tmp.innerHTML);`,
  `      const tmp = document.createElement('div');
      tmp.innerHTML = DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup', 'code'],
        ADD_ATTR: ['style', 'class', 'color', 'face', 'size']
      });
      document.execCommand('insertHTML', false, tmp.innerHTML);`
);

// 3. onPaste at ~3776
code = code.replace(
  `                            const tmp = document.createElement('div');
                            tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], FORBID_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                            tmp.querySelectorAll('*').forEach(el => { el.removeAttribute('style'); el.removeAttribute('class'); });
                            document.execCommand('insertHTML', false, tmp.innerHTML);`,
  `                            const tmp = document.createElement('div');
                            tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], ADD_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                            document.execCommand('insertHTML', false, tmp.innerHTML);`
);

// 4. onPaste at ~3870
code = code.replace(
  `                              const tmp = document.createElement('div');
                              tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], FORBID_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                              tmp.querySelectorAll('*').forEach(el => { el.removeAttribute('style'); el.removeAttribute('class'); });
                              document.execCommand('insertHTML', false, tmp.innerHTML);`,
  `                              const tmp = document.createElement('div');
                              tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], ADD_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                              document.execCommand('insertHTML', false, tmp.innerHTML);`
);

fs.writeFileSync(file, code);
console.log("Patched successfully!");
