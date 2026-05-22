const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_FILE = path.join(__dirname, '../credentials.json');
const TOKEN_FILE = path.join(__dirname, '../gmail_token.json');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function getGmailClient() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    throw new Error('credentials.json not found. Download from Google Cloud Console and place in project root.');
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Try to load existing token
  if (fs.existsSync(TOKEN_FILE)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    oauth2Client.setCredentials(token);
    
    // Refresh token if expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      const { credentials: refreshedCredentials } = await oauth2Client.refreshAccessToken();
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(refreshedCredentials));
      oauth2Client.setCredentials(refreshedCredentials);
    }
    
    return oauth2Client;
  }

  // First run: need user authorization
  console.log('First run: authorizing Gmail...');
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  console.log('\n📧 Open this URL to authorize Gmail:');
  console.log(authUrl);
  console.log('\nAfter authorizing, copy the authorization code and paste it below.\n');

  // For headless/programmatic auth, you'd need to handle the callback differently
  // For now, we'll use a simple approach that requires manual intervention
  const { google_auth_code } = require('readline-sync').question('Enter the authorization code: ', { hideEchoBack: false });
  
  const { tokens } = await oauth2Client.getToken(google_auth_code);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens));
  oauth2Client.setCredentials(tokens);

  return oauth2Client;
}

module.exports = { getGmailClient };
