const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const postcssRequire = createRequire(require.resolve('postcss'));
const { SourceMapConsumer } = postcssRequire('source-map-js');
const flat = { version: 3, sources: ['input.js'], names: [], mappings: 'AAAA' };
const indexed = (line, map = flat) => ({ version: 3, sections: [{ offset: { line, column: 0 }, map }] });

test('indexed source maps reject oversized section offsets before expansion', () => {
  // Constructor validation only: never expand an attacker-sized mapping.
  assert.throws(() => new SourceMapConsumer(indexed(10000001)), /offset/i);
  assert.throws(() => new SourceMapConsumer(indexed(6000000, indexed(6000000))), /offset/i);
});

test('indexed source maps preserve valid source positions', () => {
  const consumer = new SourceMapConsumer(indexed(2));
  assert.deepEqual(consumer.originalPositionFor({ line: 3, column: 1 }), {
    source: 'input.js', line: 1, column: 0, name: null,
  });
});
