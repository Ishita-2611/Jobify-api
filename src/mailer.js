const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const mime = require('mime-types');
const { getGmailClient } = require('./gmail');

function buildEmailBody(candidateName, candidateEmail, candidatePhone, recruiterName, jobTitle, postUrl) {
  return `Hi ${recruiterName},

I'm interested in the "${jobTitle}" position. My background aligns well with the requirements, and I'm excited about the opportunity to contribute to your team.

Please find my resume attached for your review.

Best regards,

${candidateName}
${candidateEmail}
${candidatePhone}

---
Post: ${postUrl}
`;
}

async function sendEmail(to, recruiterName, jobTitle, postUrl) {
  try {
    const gmail = google.gmail({ version: 'v1', auth: await getGmailClient() });

    const candidateName = process.env.CANDIDATE_NAME;
    const candidateEmail = process.env.CANDIDATE_EMAIL;
    const candidatePhone = process.env.CANDIDATE_PHONE;
    const resumePath = process.env.RESUME_PATH || 'resume.pdf';

    if (!fs.existsSync(resumePath)) {
      throw new Error(`Resume not found at ${resumePath}`);
    }

    // Build email body
    const emailBody = buildEmailBody(candidateName, candidateEmail, candidatePhone, recruiterName, jobTitle, postUrl);

    // Read resume
    const resume = fs.readFileSync(resumePath);
    const resumeBase64 = resume.toString('base64');

    // Create MIME message
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    const mimeMessage = [
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="' + boundary + '"',
      '',
      '--' + boundary,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      emailBody,
      '--' + boundary,
      'Content-Type: ' + mime.lookup(resumePath) + '; name="resume.pdf"',
      'Content-Disposition: attachment; filename="resume.pdf"',
      'Content-Transfer-Encoding: base64',
      '',
      resumeBase64,
      '--' + boundary + '--'
    ].join('\n');

    const encodedMessage = Buffer.from(mimeMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`✅ Email sent to ${to} (ID: ${response.data.id})`);
    return response.data.id;
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

module.exports = { sendEmail };
