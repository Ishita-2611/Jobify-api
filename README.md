# Job Applier API — Quick Start

Your job automation engine is **LIVE** and ready to use! 🚀

---

## **Server Status**

✅ **ACTIVE** at `http://localhost:3000`

**Check status:**
```bash
curl http://localhost:3000/api/status
```

---

## **API Routes**

### 1️⃣ **Search LinkedIn** (Dry Run)
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"keywords":["Python Developer","Remote"]}'
```
**Returns:** Matching posts with recruiter emails

---

### 2️⃣ **Search + Send Emails** (Full Automation)
```bash
curl -X POST http://localhost:3000/api/apply \
  -H "Content-Type: application/json" \
  -d '{"keywords":["Java Developer","Contract"]}'
```
**Does:**
1. Searches LinkedIn for keywords
2. Extracts recruiter emails
3. Sends your resume to each
4. Logs all applications

---

### 3️⃣ **Send One Email**
```bash
curl -X POST http://localhost:3000/api/apply/single \
  -H "Content-Type: application/json" \
  -d '{
    "to":"recruiter@company.com",
    "recruiterName":"Jane Doe",
    "jobTitle":"Python Developer",
    "postUrl":"https://linkedin.com/posts/123"
  }'
```

---

### 4️⃣ **View All Logs**
```bash
curl http://localhost:3000/api/logs
```
**Shows:** All sent/skipped applications with timestamps

---

## **Configuration**

Edit `.env`:
```
CANDIDATE_NAME=Your Name
CANDIDATE_EMAIL=your@email.com
CANDIDATE_PHONE=+1-555-123-4567
RESUME_PATH=resume.pdf
LINKEDIN_EMAIL=your_linkedin@email.com
LINKEDIN_PASS=your_linkedin_password
PORT=3000
```

---

## **Gmail Authorization** (First Time Only)

When you first use `/api/apply` or `/api/apply/single`, you'll get an error with a Google authentication link.

**Follow these steps:**
1. Open the provided Google OAuth URL in your browser
2. Click "Authorize"
3. Copy the authorization code from the redirect URL
4. Run the command provided in the error message
5. Done! Token is saved, all future emails work automatically

---

## **Server Commands**

```bash
# Start server
npm start

# Auto-restart on file changes (development)
npm run dev

# Save LinkedIn session (one-time)
npm run login
```

---

## **Real LinkedIn vs Mock Session**

**Current:** Using mock session (for testing)
**To use real LinkedIn:**
```bash
npm run login
```
This opens a browser, logs in with your `.env` credentials, and saves the session.

---

## **Features**

✅ Search LinkedIn posts by keywords  
✅ Extract recruiter emails from posts  
✅ Auto-send emails with your resume  
✅ Gmail OAuth2 integration  
✅ Application logging to CSV  
✅ RESTful API for all operations  
✅ Graceful error handling  
✅ Session persistence  

---

## **Rate Limits & Best Practices**

- **LinkedIn:** 1-2 searches/day max (avoid detection)
- **Gmail:** 500 emails/day on free Gmail, 2000 on Workspace
- **Posts without email:** Logged as "skipped" — use `/api/apply/single` for manual follow-up

---

## **File Structure**

```
├── src/
│   ├── server.js          Express app + routes
│   ├── linkedin.js        LinkedIn scraper
│   ├── gmail.js           Gmail OAuth2 client
│   ├── mailer.js          Email builder
│   └── linkedinLogin.js   Session saver
├── .env                   Your secrets
├── credentials.json       Gmail OAuth credentials
├── linkedin_session.json  LinkedIn cookies
├── resume.pdf            Your resume
└── applications_log.csv  Auto-generated log
```

---

## **Troubleshooting**

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `taskkill /IM node.exe /F` then `npm start` |
| Resume not found | Add `resume.pdf` to project root |
| LinkedIn session expired | Run `npm run login` |
| Gmail auth fails | Re-download `credentials.json` from Google Cloud |
| Timeout on LinkedIn search | Network issue — retry in a moment |

---

**Enjoy automating your job search!** 🎯

For detailed documentation, see [SETUP_GUIDE.md](SETUP_GUIDE.md)
