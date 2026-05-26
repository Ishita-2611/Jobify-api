const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const mime = require('mime');
const { getGmailClient } = require('./gmail');

function sanitizeHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildEmailBody(candidateName, candidateEmail, candidatePhone, recruiterName, jobTitle, postUrl) {
  const greetingName = recruiterName && recruiterName !== 'Unknown' ? recruiterName : 'Hiring Team';

  return `Hi ${greetingName},

I hope you are doing well. I found your recent LinkedIn post about the "${jobTitle || 'open'}" opportunity and would like to apply for the role.

My resume is attached for your review. I would be grateful if you could consider my profile and let me know if any additional submission details are required.

Thank you for your time and consideration.

Best regards,

${candidateName || ''}
${candidateEmail || ''}
${candidatePhone || ''}

---
LinkedIn post: ${postUrl || 'N/A'}
`;
}

function buildMimeMessage({ to, subject, body, attachmentPath, attachmentName }) {
  if (!to) throw new Error('Recipient email is required');
  if (!body) throw new Error('Email body is required');
  if (!attachmentPath) throw new Error('Attachment path is required');

  const attachment = fs.readFileSync(attachmentPath);
  const safeAttachmentName = sanitizeHeader(attachmentName || path.basename(attachmentPath));
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const mimeMessage = [
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${sanitizeHeader(subject || 'Application for job opportunity')}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    `--${boundary}`,
    `Content-Type: ${mime.getType(attachmentPath) || 'application/octet-stream'}; name="${safeAttachmentName}"`,
    `Content-Disposition: attachment; filename="${safeAttachmentName}"`,
    'Content-Transfer-Encoding: base64',
    '',
    attachment.toString('base64'),
    `--${boundary}--`
  ].join('\r\n');

  return encodeBase64Url(mimeMessage);
}

async function sendEmail(to, recruiterName, jobTitle, postUrl) {
  try {
    const gmail = google.gmail({ version: 'v1', auth: await getGmailClient() });

    const candidateName = process.env.CANDIDATE_NAME;
    const candidateEmail = process.env.CANDIDATE_EMAIL;
    const candidatePhone = process.env.CANDIDATE_PHONE;
    const resumePath = path.resolve(process.env.RESUME_PATH || 'resume.pdf');

    if (!fs.existsSync(resumePath)) {
      throw new Error(`Resume not found at ${resumePath}`);
    }

    const emailBody = buildEmailBody(candidateName, candidateEmail, candidatePhone, recruiterName, jobTitle, postUrl);
    const encodedMessage = buildMimeMessage({
      to,
      subject: `Application for ${jobTitle || 'job opportunity'}`,
      body: emailBody,
      attachmentPath: resumePath,
      attachmentName: path.basename(resumePath)
    });

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`Email sent to ${to} (ID: ${response.data.id})`);
    return response.data.id;
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

module.exports = { buildEmailBody, buildMimeMessage, encodeBase64Url, sendEmail };
