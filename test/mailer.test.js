const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildEmailBody, buildMimeMessage } = require('../src/mailer');

function decodeBase64Url(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

test('buildEmailBody includes candidate details and post URL', () => {
  const body = buildEmailBody(
    'Ishita',
    'ishita@gmail.com',
    '+1-555-123-4567',
    'Jane',
    'Java Developer Contract',
    'https://linkedin.com/posts/123'
  );

  assert.match(body, /Hi Jane/);
  assert.match(body, /Java Developer Contract/);
  assert.match(body, /ishita@gmail\.com/);
  assert.match(body, /https:\/\/linkedin\.com\/posts\/123/);
});

test('buildMimeMessage includes to, subject, and attachment headers', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobify-'));
  const resumePath = path.join(tempDir, 'resume.pdf');
  fs.writeFileSync(resumePath, 'fake pdf');

  const raw = buildMimeMessage({
    to: 'recruiter@example.com',
    subject: 'Application for Java Developer',
    body: 'Hello',
    attachmentPath: resumePath,
    attachmentName: 'resume.pdf'
  });

  const decoded = decodeBase64Url(raw);
  assert.match(decoded, /^To: recruiter@example\.com/m);
  assert.match(decoded, /^Subject: Application for Java Developer/m);
  assert.match(decoded, /Content-Disposition: attachment; filename="resume\.pdf"/);
});
