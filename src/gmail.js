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
  // For now, throw an error with instructions
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  const instructions = `
  ========================================
  Gmail Authorization Required
  ========================================
  
  1. Open this URL in your browser:
  ${authUrl}
  
  2. Authorize the application
  
  3. Copy the authorization code from the URL
  
  4. Run this command:
     node -e "const {google}=require('googleapis'); const {OAuth2}=google.auth; const creds=require('./credentials.json').installed; const client=new OAuth2(creds.client_id,creds.client_secret,creds.redirect_uris[0]); const readline=require('readline'); const rl=readline.createInterface({input:process.stdin,output:process.stdout}); rl.question('Paste authorization code: ',async code=>{const {tokens}=await client.getToken(code); require('fs').writeFileSync('gmail_token.json',JSON.stringify(tokens)); console.log('✅ Token saved!'); process.exit();});"
  
  ========================================
  `;

  throw new Error(instructions);
}

module.exports = { getGmailClient };
