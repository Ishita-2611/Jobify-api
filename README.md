# Jobify API

Jobify is a Node.js automation API that helps search LinkedIn job posts, extract visible recruiter email addresses, and send a formal Gmail application email with a resume attachment.

It is built with a review-first flow: searches and previews happen first, and emails are only sent when `confirmSend=true` is provided.

## What It Does

- Logs in to LinkedIn using credentials from `.env` and saves a reusable session.
- Searches LinkedIn posts by keywords such as `Software Engineer`, `Java Developer`, or `Contract`.
- Filters for recent LinkedIn post text, currently up to 24 hours where LinkedIn exposes timestamps like `2h`, `12 hours`, or `just now`.
- Extracts recruiter emails that are visibly present in the post/job text.
- Sends Gmail application emails with candidate details and attached resume.
- Logs sent, skipped, and failed applications to `applications_log.csv`.

Important: Jobify cannot guess hidden recruiter emails. It only extracts emails visible in LinkedIn text, such as `hr@company.com`.

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` in the project root:

```env
CANDIDATE_NAME=Your Name
CANDIDATE_EMAIL=your.gmail@gmail.com
CANDIDATE_PHONE=+91-XXXXXXXXXX
RESUME_PATH=resume.pdf

LINKEDIN_EMAIL=your_linkedin_email
LINKEDIN_PASS=your_linkedin_password

PORT=3000
```

Place these files in the project root:

- `resume.pdf`
- `credentials.json` from Google Cloud OAuth credentials

## Gmail Setup

Enable the Gmail API in your Google Cloud project, then authorize Gmail:

```bash
npm run gmail-auth
```

This opens a browser OAuth flow and saves:

```text
gmail_token.json
```

If Google shows `Error 403: access_denied`, add your Gmail address as a test user in Google Cloud:

```text
APIs & Services -> OAuth consent screen -> Test users
```

## LinkedIn Setup

Save a LinkedIn browser session:

```bash
npm run login
```

The script opens LinkedIn, fills credentials from `.env`, and saves:

```text
linkedin_session.json
```

If LinkedIn asks for captcha, 2FA, or checkpoint verification, complete it in the opened browser.

## Run

Start the API:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## API

### Status

```bash
curl http://localhost:3000/api/status
```

Checks whether resume, Gmail token, Gmail credentials, and LinkedIn session files exist.

### Search LinkedIn Without Sending

```bash
curl -X POST http://localhost:3000/api/search ^
  -H "Content-Type: application/json" ^
  -d "{\"keywords\":[\"Software Engineer\"]}"
```

Returns matching LinkedIn results with extracted recruiter emails. No email is sent.

### Preview Applications

```bash
curl -X POST http://localhost:3000/api/apply ^
  -H "Content-Type: application/json" ^
  -d "{\"keywords\":[\"Java Developer\",\"Contract\"]}"
```

This searches LinkedIn and returns what is ready to send. No email is sent without confirmation.

### Send Applications

```bash
curl -X POST http://localhost:3000/api/apply ^
  -H "Content-Type: application/json" ^
  -d "{\"keywords\":[\"Java Developer\",\"Contract\"],\"confirmSend\":true}"
```

This searches LinkedIn again and sends emails to visible recruiter emails found in matching posts.

### Send One Email

Preview only:

```bash
curl -X POST http://localhost:3000/api/apply/single ^
  -H "Content-Type: application/json" ^
  -d "{\"to\":\"recruiter@company.com\",\"recruiterName\":\"Hiring Team\",\"jobTitle\":\"Software Engineer\",\"postUrl\":\"https://linkedin.com/jobs/view/123\"}"
```

Send:

```bash
curl -X POST http://localhost:3000/api/apply/single ^
  -H "Content-Type: application/json" ^
  -d "{\"to\":\"recruiter@company.com\",\"recruiterName\":\"Hiring Team\",\"jobTitle\":\"Software Engineer\",\"postUrl\":\"https://linkedin.com/jobs/view/123\",\"confirmSend\":true}"
```

### Logs

```bash
curl http://localhost:3000/api/logs
```

Returns application history from `applications_log.csv`.

## Project Structure

```text
src/
  server.js           Express API routes and logging
  linkedin.js         LinkedIn search, filtering, and email extraction
  linkedinLogin.js    LinkedIn session saver
  gmail.js            Gmail OAuth client
  gmailAuthAuto.js    Browser-based Gmail OAuth setup
  gmailAuthManual.js  Manual Gmail OAuth setup
  mailer.js           Email body, MIME attachment, and Gmail send
test/
  linkedin.test.js
  mailer.test.js
  server.test.js
```

Generated/local files:

```text
.env
credentials.json
gmail_token.json
linkedin_session.json
resume.pdf
applications_log.csv
```

These are ignored by git because they contain secrets, local sessions, or private documents.

## Notes

- Use the preview endpoints first.
- Do not send bulk emails blindly.
- LinkedIn may change page structure, rate limit, or require re-login.
- Many LinkedIn jobs do not show an email; in those cases Jobify cannot extract one.
- If Gmail sending fails with `invalid_grant`, rerun `npm run gmail-auth`.
- If LinkedIn redirects to login or checkpoint, rerun `npm run login`.
