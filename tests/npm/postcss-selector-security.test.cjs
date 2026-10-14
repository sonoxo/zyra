const assert = require('node:assert/strict');
const { test } = require('node:test');

const parserPackage = require('postcss-selector-parser/package.json');
const parser = require('postcss-selector-parser');

test('postcss selector parser is pinned to the patched floor', () => {
  assert.equal(parserPackage.version, '7.1.6');
});

test('typography-style selectors remain compatible with patched parser', () => {
  const input = 'article.prose :where(h1,h2):not(:where([class~="not-prose"],[class~="not-prose"] *))';
  const output = parser().processSync(input);
  assert.equal(output, input);
});
