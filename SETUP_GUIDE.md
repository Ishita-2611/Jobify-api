# Job Applier — Setup Complete! 🚀

Your Node.js + Express job application automation system is ready.

---

## **Current Status**

✅ Server running on `http://localhost:3000`  
✅ Dependencies installed (169 packages)  
✅ Resume found and loaded  
✅ LinkedIn session ready  
✅ All API endpoints functional  

---

## **What's Been Set Up**

### **Project Structure**
```
Jobify-api/
├── src/
│   ├── server.js          Express app + all routes
│   ├── linkedin.js        LinkedIn post scraper
│   ├── gmail.js           Gmail OAuth2 client
│   ├── mailer.js          Email builder + sender
│   └── linkedinLogin.js   Session saver
├── .env                   Your secrets (git-ignored)
├── credentials.json       Gmail OAuth credentials
├── linkedin_session.json  LinkedIn cookies
├── resume.pdf            Your resume
├── package.json          Dependencies
└── applications_log.csv  Auto-generated log
```

### **Environment Variables** (in `.env`)
- `CANDIDATE_NAME` — Your name
- `CANDIDATE_EMAIL` — Your email
- `CANDIDATE_PHONE` — Your phone
- `RESUME_PATH` — Path to resume PDF
- `LINKEDIN_EMAIL` — LinkedIn login email
- `LINKEDIN_PASS` — LinkedIn login password
- `PORT` — Server port (default 3000)

---

## **API Endpoints**

### `GET /api/status`
Health check. Shows configuration status.
```bash
curl http://localhost:3000/api/status
```
**Response:**
```json
{
  "status": "ok",
  "candidate": "Your Name",
  "resumeExists": true,
  "sessionExists": true,
  "gmailTokenReady": false
}
```

---

### `POST /api/search`
Search LinkedIn posts (dry run — no emails sent).
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["Java Developer", "Contract"]}'
```
**Response:**
```json
{
  "count": 3,
  "results": [
    {
      "recruiterName": "Jane Doe",
      "recruiterEmail": "jane@company.com",
      "jobTitle": "Java Developer – 6 Month Contract",
      "postText": "We are hiring...",
      "postUrl": "https://linkedin.com/posts/..."
    }
  ]
}
```

---

### `POST /api/apply`
Search LinkedIn AND send emails to all recruiters found.
```bash
curl -X POST http://localhost:3000/api/apply \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["Java Developer", "Contract"]}'
```
**Response:**
```json
{
  "sent": 2,
  "skipped": 1,
  "errors": 0,
  "total": 3,
  "results": [
    {
      "recruiterName": "Jane Doe",
      "recruiterEmail": "jane@company.com",
      "status": "sent (id=18c...)"
    }
  ]
}
```

---

### `POST /api/apply/single`
Send one targeted email manually.
```bash
curl -X POST http://localhost:3000/api/apply/single \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recruiter@company.com",
    "recruiterName": "Jane Doe",
    "jobTitle": "Java Developer Contract",
    "postUrl": "https://linkedin.com/posts/..."
  }'
```
**Response:**
```json
{
  "success": true,
  "messageId": "18c...",
  "to": "recruiter@company.com"
}
```

---

### `GET /api/logs`
Retrieve all sent/skipped emails.
```bash
curl http://localhost:3000/api/logs
```
**Response:**
```json
{
  "count": 5,
  "logs": [
    {
      "timestamp": "2025-01-20T10:30:00.000Z",
      "recruiterName": "Jane Doe",
      "recruiterEmail": "jane@company.com",
      "jobTitle": "Java Developer Contract",
      "postUrl": "https://...",
      "status": "sent (id=18c...)"
    }
  ]
}
```

---

## **Next Steps**

### **1. Authenticate Gmail** (One-time)

When you run `/api/apply` or `/api/apply/single` for the first time, it will return:

```
Gmail Authorization Required

1. Open this URL in your browser:
   https://accounts.google.com/o/oauth2/auth?...

2. Authorize the application

3. Copy the authorization code from the URL

4. Run:
   node -e "..." (provided in error message)
```

This saves the token to `gmail_token.json` for all future use.

---

### **2. Use Real LinkedIn Session** (Optional)

Currently using a mock session for testing. To use real LinkedIn:

```bash
npm run login
```

This will:
1. Open a browser
2. Auto-fill your credentials from `.env`
3. Let you log in (if 2FA/captcha needed)
4. Save cookies to `linkedin_session.json`

---

### **3. Customize Email Template** (Optional)

Edit the `buildEmailBody()` function in `src/mailer.js` to customize the application email.

---

## **Server Commands**

```bash
# Start server (production)
npm start

# Start with auto-reload (development)
npm run dev

# Save LinkedIn session
npm run login
```

---

## **Important Notes**

- **LinkedIn anti-bot**: Use light (1–2 runs/day max) to avoid detection
- **Gmail daily limit**: 500 emails/day on free Gmail, 2000 on Workspace
- **Posts without email**: Many recruiters don't include emails in posts — use `/api/apply/single` for manual follow-up
- **Secrets are git-ignored**: `.env`, `credentials.json`, `gmail_token.json`, `linkedin_session.json` won't be pushed to GitHub

---

## **Troubleshooting**

### Port 3000 already in use?
```bash
taskkill /IM node.exe /F
npm start
```

### Resume not found?
- Ensure `resume.pdf` is in the project root
- Or update `RESUME_PATH` in `.env` to the correct path

### LinkedIn session expired?
```bash
npm run login
```

### Gmail authentication failed?
- Download `credentials.json` from Google Cloud Console
- Place in project root
- Re-run the application

---

**Ready to find jobs!** 🎯
