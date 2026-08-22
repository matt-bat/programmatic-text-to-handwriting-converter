export const MAX_SOURCE_CHARACTERS = 50_000;
export const MAX_SOURCE_FILE_BYTES = 1_000_000;

function stripInlineMarkdown(line) {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(~~)(.*?)\1/g, '$2')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, '$1')
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/<[^>]+>/g, '');
}

export function formatMarkdownForHandwriting(markdown) {
  const lines = String(markdown).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const formatted = [];
  let inFence = false;
  const frontMatterEnd = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  let inFrontMatter = lines[0]?.trim() === '---'
    && frontMatterEnd > 0
    && lines.slice(1, frontMatterEnd).some((line) => /^[\w-]+\s*:/.test(line));

  for (let index = 0; index < lines.length; index += 1) {
    const sourceLine = lines[index];
    const trimmed = sourceLine.trim();

    if (inFrontMatter) {
      if (index === frontMatterEnd) inFrontMatter = false;
      continue;
    }
    if (/^\s*(```|~~~)/.test(sourceLine)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      formatted.push(sourceLine.replace(/^ {0,4}/, '    '));
      continue;
    }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(sourceLine)) {
      formatted.push('');
      continue;
    }

    let line = sourceLine;
    line = line.replace(/^\s{0,3}#{1,6}\s+/, '');
    line = line.replace(/^\s*>\s?/, '" ');
    line = line.replace(/^(\s*)[-+*]\s+\[([ xX])\]\s+/, (_, indent, checked) => `${indent}[${checked.trim() ? 'x' : ' '}] `);
    line = line.replace(/^(\s*)[-+*]\s+/, '$1- ');
    line = line.replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/, '');
    line = line.replace(/^\s*\|(.+)\|\s*$/, (_, cells) => cells.split('|').map((cell) => cell.trim()).join(' | '));
    formatted.push(stripInlineMarkdown(line));
  }

  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function sourceKindFromFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.markdown') || type === 'text/markdown') return 'markdown';
  if (name.endsWith('.txt') || type === 'text/plain') return 'text';
  return null;
}
