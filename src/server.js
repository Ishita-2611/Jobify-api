require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { searchLinkedIn } = require('./linkedin');
const { sendEmail } = require('./mailer');

const app = express();
app.use(express.json());

const LOGS_FILE = path.join(__dirname, '../applications_log.csv');

// Initialize logs file with header if it doesn't exist
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, 'timestamp,recruiterName,recruiterEmail,jobTitle,postUrl,status\n');
}

// Helper: append log entry
function logApplication(recruiterName, recruiterEmail, jobTitle, postUrl, status) {
  const timestamp = new Date().toISOString();
  const line = `${timestamp},"${recruiterName}","${recruiterEmail}","${jobTitle}","${postUrl}","${status}"\n`;
  fs.appendFileSync(LOGS_FILE, line);
}

// Helper: check if config files exist
function getStatus() {
  return {
    status: 'ok',
    candidate: process.env.CANDIDATE_NAME || 'N/A',
    resumeExists: fs.existsSync(process.env.RESUME_PATH || 'resume.pdf'),
    sessionExists: fs.existsSync(path.join(__dirname, '../linkedin_session.json')),
    gmailTokenReady: fs.existsSync(path.join(__dirname, '../gmail_token.json'))
  };
}

// GET /api/status
app.get('/api/status', (req, res) => {
  res.json(getStatus());
});

// POST /api/search
app.post('/api/search', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array required' });
    }

    const results = await searchLinkedIn(keywords);
    res.json({
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/apply
app.post('/api/apply', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array required' });
    }

    const results = await searchLinkedIn(keywords);
    let sent = 0, skipped = 0, errors = 0;
    const responses = [];

    for (const result of results) {
      try {
        if (!result.recruiterEmail || result.recruiterEmail === 'N/A') {
          responses.push({
            recruiterName: result.recruiterName,
            recruiterEmail: 'N/A',
            status: 'skipped — no email in post'
          });
          logApplication(result.recruiterName, 'N/A', result.jobTitle, result.postUrl, 'skipped — no email');
          skipped++;
        } else {
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
        }
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

// POST /api/apply/single
app.post('/api/apply/single', async (req, res) => {
  try {
    const { to, recruiterName, jobTitle, postUrl } = req.body;
    if (!to || !recruiterName) {
      return res.status(400).json({ error: 'to and recruiterName required' });
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

// GET /api/logs
app.get('/api/logs', (req, res) => {
  try {
    const csv = fs.readFileSync(LOGS_FILE, 'utf-8');
    const lines = csv.trim().split('\n');
    const logs = [];

    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parser (assumes fields are quoted if they contain commas)
      const match = lines[i].match(/(.+?),"(.+?)","(.+?)","(.+?)","(.+?)","(.+?)"/);
      if (match) {
        logs.push({
          timestamp: match[1],
          recruiterName: match[2],
          recruiterEmail: match[3],
          jobTitle: match[4],
          postUrl: match[5],
          status: match[6]
        });
      }
    }

    res.json({
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Status: ${JSON.stringify(getStatus())}`);
});
