const test = require('node:test');
const assert = require('node:assert/strict');
const { csvEscape, parseCsvLine } = require('../src/server');

test('csvEscape and parseCsvLine handle commas and quotes', () => {
  const line = [
    csvEscape('2026-05-26T10:00:00.000Z'),
    csvEscape('Jane "JJ" Doe'),
    csvEscape('jane@example.com'),
    csvEscape('Java Developer, Contract'),
    csvEscape('https://linkedin.com/posts/123'),
    csvEscape('sent')
  ].join(',');

  assert.deepEqual(parseCsvLine(line), [
    '2026-05-26T10:00:00.000Z',
    'Jane "JJ" Doe',
    'jane@example.com',
    'Java Developer, Contract',
    'https://linkedin.com/posts/123',
    'sent'
  ]);
});
