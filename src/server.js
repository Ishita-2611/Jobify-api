require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { searchLinkedIn } = require('./linkedin');
const { sendEmail } = require('./mailer');

const app = express();
app.use(express.json());

const LOGS_FILE = path.join(__dirname, '../applications_log.csv');

if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, 'timestamp,recruiterName,recruiterEmail,jobTitle,postUrl,status\n');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function logApplication(recruiterName, recruiterEmail, jobTitle, postUrl, status) {
  const row = [
    new Date().toISOString(),
    recruiterName || 'Unknown',
    recruiterEmail || 'N/A',
    jobTitle || 'N/A',
    postUrl || 'N/A',
    status || 'unknown'
  ].map(csvEscape).join(',');

  fs.appendFileSync(LOGS_FILE, `${row}\n`);
}

function getStatus() {
  const resumePath = path.resolve(process.env.RESUME_PATH || 'resume.pdf');

  return {
    status: 'ok',
    candidate: process.env.CANDIDATE_NAME || 'N/A',
    candidateEmail: process.env.CANDIDATE_EMAIL || 'N/A',
    resumeExists: fs.existsSync(resumePath),
    resumePath,
    sessionExists: fs.existsSync(path.join(__dirname, '../linkedin_session.json')),
    gmailTokenReady: fs.existsSync(path.join(__dirname, '../gmail_token.json')),
    gmailCredentialsReady: fs.existsSync(path.join(__dirname, '../credentials.json'))
  };
}

app.get('/api/status', (req, res) => {
  res.json(getStatus());
});

app.post('/api/search', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array required' });
    }

    const results = await searchLinkedIn(keywords);
    res.json({
      count: results.length,
      maxAgeHours: 24,
      notice: 'Dry run only. Use /api/apply with confirmSend=true after reviewing results.',
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/apply', async (req, res) => {
  try {
    const { keywords, confirmSend } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array required' });
    }

    const results = await searchLinkedIn(keywords);
    const sendable = results.filter(result => result.recruiterEmail && result.recruiterEmail !== 'N/A');

    if (!confirmSend) {
      return res.json({
        sent: 0,
        readyToSend: sendable.length,
        total: results.length,
        notice: 'No emails sent. Review these matches, then call again with confirmSend=true.',
        results
      });
    }

    let sent = 0;
    let skipped = 0;
    let errors = 0;
    const responses = [];

    for (const result of results) {
      try {
        if (!result.recruiterEmail || result.recruiterEmail === 'N/A') {
          responses.push({
            recruiterName: result.recruiterName,
            recruiterEmail: 'N/A',
            status: 'skipped - no email in post'
          });
          logApplication(result.recruiterName, 'N/A', result.jobTitle, result.postUrl, 'skipped - no email');
          skipped++;
          continue;
        }

        const messageId = await sendEmail(
          result.recruiterEmail,
          result.recruiterName,
          result.jobTitle,
          result.postUrl
        );

        responses.push({
          recruiterName: result.recruiterName,
          recruiterEmail: result.recruiterEmail,
          status: `sent (id=${messageId.substring(0, 5)}...)`
        });
        logApplication(result.recruiterName, result.recruiterEmail, result.jobTitle, result.postUrl, `sent (id=${messageId})`);
        sent++;
      } catch (err) {
        console.error(`Error sending to ${result.recruiterEmail}:`, err);
        responses.push({
          recruiterName: result.recruiterName,
          recruiterEmail: result.recruiterEmail,
          status: `error: ${err.message}`
        });
        logApplication(result.recruiterName, result.recruiterEmail, result.jobTitle, result.postUrl, `error: ${err.message}`);
        errors++;
      }
    }

    res.json({
      sent,
      skipped,
      errors,
      total: results.length,
      results: responses
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/apply/single', async (req, res) => {
  try {
    const { to, recruiterName, jobTitle, postUrl, confirmSend } = req.body;
    if (!to || !recruiterName) {
      return res.status(400).json({ error: 'to and recruiterName required' });
    }

    if (!confirmSend) {
      return res.json({
        sent: false,
        notice: 'No email sent. Review the payload, then call again with confirmSend=true.',
        draft: { to, recruiterName, jobTitle: jobTitle || 'N/A', postUrl: postUrl || 'N/A' }
      });
    }

    const messageId = await sendEmail(to, recruiterName, jobTitle || 'N/A', postUrl || 'N/A');
    logApplication(recruiterName, to, jobTitle || 'N/A', postUrl || 'N/A', `sent (id=${messageId})`);

    res.json({
      success: true,
      messageId,
      to
    });
  } catch (error) {
    console.error('Single apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    const csv = fs.readFileSync(LOGS_FILE, 'utf-8').trim();
    if (!csv) return res.json({ count: 0, logs: [] });

    const lines = csv.split(/\r?\n/);
    const headers = parseCsvLine(lines[0]);
    const logs = lines.slice(1).map(line => {
      const fields = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, fields[index] || '']));
    });

    res.json({
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Status: ${JSON.stringify(getStatus())}`);
  });
}

module.exports = { app, csvEscape, getStatus, logApplication, parseCsvLine };
