const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const applyInlineFormatting = (str) => {
  let output = str;
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  output = output.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  output = output.replace(/~~(.*?)~~/g, '<del>$1</del>');
  return output;
};

export const renderMarkdown = (input = '') => {
  if (!input) return '';

  const normalized = input.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  lines.forEach((rawLine) => {
    const trimmedEnd = rawLine.replace(/\s+$/, '');
    const line = trimmedEnd.trim();

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const content = line.replace(/^[-*]\s+/, '');
      html += `<li>${applyInlineFormatting(escapeHtml(content))}</li>`;
    } else if (line === '') {
      closeList();
      html += '<br />';
    } else {
      closeList();
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        html += `<h${level}>${applyInlineFormatting(escapeHtml(content))}</h${level}>`;
      } else {
        html += `<p>${applyInlineFormatting(escapeHtml(trimmedEnd))}</p>`;
      }
    }
  });

  closeList();
  return html;
};

export const renderMarkdownToNode = (input = '') => ({
  __html: renderMarkdown(input),
});

