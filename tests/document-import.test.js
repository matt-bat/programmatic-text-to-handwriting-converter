import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_SOURCE_CHARACTERS,
  MAX_SOURCE_CODE_UNITS,
  formatMarkdownForHandwriting,
  sourceKindFromFile,
} from '../src/document-import.js';

test('Markdown becomes handwriting-friendly text while preserving document meaning', () => {
  const markdown = `---
title: Hidden metadata
---
# Field Notes

- first **important** point
- [x] finished task
1. numbered item
> quoted *observation*

Read [the source](https://example.com).

\`\`\`js
const ink = true;
\`\`\``;

  assert.equal(formatMarkdownForHandwriting(markdown), `Field Notes
___________

- first important point
[x] finished task
1. numbered item
“quoted observation”

Read the source (https://example.com).

    const ink = true;`);
});

test('headings and quotations retain natural handwritten hierarchy', () => {
  assert.equal(
    formatMarkdownForHandwriting('## Materials\n\n> Keep this note visible.\n\n### Detail'),
    'Materials\n_________\n\n“Keep this note visible.”\n\nDetail',
  );
});

test('Markdown tables remain readable and formatting-only rules disappear', () => {
  const markdown = '| Name | Value |\n| --- | ---: |\n| Ink | 42 |\n\n---';
  assert.equal(formatMarkdownForHandwriting(markdown), 'Name | Value\n\nInk | 42');
});

test('an opening horizontal rule without front-matter fields does not erase the document', () => {
  assert.equal(formatMarkdownForHandwriting('---\nA field note'), 'A field note');
});

test('intraword underscores remain intact while emphasis markers are removed', () => {
  assert.equal(
    formatMarkdownForHandwriting('Keep some_var_name and write _this naturally_.'),
    'Keep some_var_name and write this naturally.',
  );
});

test('HTML formatting is removed without creating executable tag text', () => {
  assert.equal(formatMarkdownForHandwriting('<strong>Field note</strong>'), 'Field note');
  assert.equal(formatMarkdownForHandwriting('<scr<script>ipt>alert(1)</script>'), 'ipt>alert(1)');
  assert.equal(formatMarkdownForHandwriting('Keep 1 < 2 and 3 > 2 readable.'), 'Keep 1 < 2 and 3 > 2 readable.');
});

test('supported source files are identified without trusting MIME metadata alone', () => {
  assert.equal(sourceKindFromFile({ name: 'notes.md', type: '' }), 'markdown');
  assert.equal(sourceKindFromFile({ name: 'notes.markdown', type: 'application/octet-stream' }), 'markdown');
  assert.equal(sourceKindFromFile({ name: 'notes.txt', type: '' }), 'text');
  assert.equal(sourceKindFromFile({ name: 'notes.pdf', type: 'application/pdf' }), null);
  assert.equal(sourceKindFromFile({ name: 'notes.pdf', type: '' }), null);
  assert.equal(MAX_SOURCE_CHARACTERS, 50_000);
  assert.equal(MAX_SOURCE_CODE_UNITS, 200_000);
});
