const fs = require('fs');
const file = './src/components/PageEditor/BlockEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

const tablePasteHelper = `
  const handleTablePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData?.getData('text/html');
    if (!html) return false;

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const table = tmp.querySelector('table');
    
    if (table) {
      e.preventDefault();
      e.stopPropagation();

      const trs = Array.from(table.querySelectorAll('tr'));
      if (trs.length === 0) return true;

      let newHeaders = [];
      let newRows = [];

      const sanitizeCell = (cell) => {
        return DOMPurify.sanitize(cell.innerHTML || '', {
          USE_PROFILES: { html: true },
          ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'],
          ADD_ATTR: ['style', 'class', 'color', 'face', 'size']
        });
      };

      if (hasHeader) {
        newHeaders = Array.from(trs[0].querySelectorAll('th, td')).map(sanitizeCell);
        for (let i = 1; i < trs.length; i++) {
          newRows.push(Array.from(trs[i].querySelectorAll('th, td')).map(sanitizeCell));
        }
      } else {
        newHeaders = Array.from(trs[0].querySelectorAll('th, td')).map(() => '');
        for (let i = 0; i < trs.length; i++) {
          newRows.push(Array.from(trs[i].querySelectorAll('th, td')).map(sanitizeCell));
        }
      }

      // Pad rows to match max columns
      const maxCols = Math.max(newHeaders.length, ...newRows.map(r => r.length));
      while (newHeaders.length < maxCols) newHeaders.push('');
      newRows = newRows.map(row => {
        const newRow = [...row];
        while (newRow.length < maxCols) newRow.push('');
        return newRow;
      });

      update({ headers: newHeaders, rows: newRows });
      return true;
    }
    return false;
  };
`;

// Insert the helper just before addRow in the table case block
code = code.replace(
  `  const addRow = () => {
    if (!headers.length) return;`,
  tablePasteHelper + `\n  const addRow = () => {\n    if (!headers.length) return;`
);

// Update header onPaste
code = code.replace(
  `                        onPaste={(e) => {
                          const html = e.clipboardData?.getData('text/html');
                          if (html) {
                            e.preventDefault();
                            const tmp = document.createElement('div');
                            tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], ADD_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                            document.execCommand('insertHTML', false, tmp.innerHTML);
                          }
                        }}`,
  `                        onPaste={(e) => {
                          if (handleTablePaste(e)) return;
                          const html = e.clipboardData?.getData('text/html');
                          if (html) {
                            e.preventDefault();
                            const tmp = document.createElement('div');
                            tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], ADD_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                            document.execCommand('insertHTML', false, tmp.innerHTML);
                          }
                        }}`
);

// Update cell onPaste
code = code.replace(
  `                          onPaste={(e) => {
                            const html = e.clipboardData?.getData('text/html');
                            if (html) {
                              e.preventDefault();
                              const tmp = document.createElement('div');
                              tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], ADD_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                              document.execCommand('insertHTML', false, tmp.innerHTML);
                            }
                          }}`,
  `                          onPaste={(e) => {
                            if (handleTablePaste(e)) return;
                            const html = e.clipboardData?.getData('text/html');
                            if (html) {
                              e.preventDefault();
                              const tmp = document.createElement('div');
                              tmp.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_TAGS: ['font', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'], ADD_ATTR: ['style', 'class', 'color', 'face', 'size'] });
                              document.execCommand('insertHTML', false, tmp.innerHTML);
                            }
                          }}`
);

fs.writeFileSync(file, code);
console.log("Patched table paste successfully!");
