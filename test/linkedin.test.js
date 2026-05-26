const test = require('node:test');
const assert = require('node:assert/strict');
const { extractEmails, hasAllKeywords, isRecentLinkedInPost } = require('../src/linkedin');

test('extractEmails returns unique normalized emails', () => {
  const emails = extractEmails('Send profiles to Recruiter@Example.com or recruiter@example.com and jobs@test.io');

  assert.deepEqual(emails, ['recruiter@example.com', 'jobs@test.io']);
});

test('hasAllKeywords requires every keyword', () => {
  const text = 'Hiring Java Developer for a 6 month contract role';

  assert.equal(hasAllKeywords(text, ['JAVA DEVELOPER', 'contract']), true);
  assert.equal(hasAllKeywords(text, ['JAVA DEVELOPER', 'full time']), false);
});

test('isRecentLinkedInPost accepts posts within 24 hours', () => {
  assert.equal(isRecentLinkedInPost('2h ago Java Developer contract'), true);
  assert.equal(isRecentLinkedInPost('24 hours ago Java Developer contract'), true);
  assert.equal(isRecentLinkedInPost('25 hours ago Java Developer contract'), false);
  assert.equal(isRecentLinkedInPost('2 days ago Java Developer contract'), false);
});
