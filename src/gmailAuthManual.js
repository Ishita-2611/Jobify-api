require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const TOKEN_PATH = 'gmail_token.json';
const CREDS = require('../credentials.json').installed;

async function authenticateGmailManual() {
  console.log('🔐 Manual Gmail Authorization\n');
  console.log('================================\n');
  
  const oauth2Client = new google.auth.OAuth2(
    CREDS.client_id,
    CREDS.client_secret,
    CREDS.redirect_uris[0]
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  console.log('📋 Step 1: Visit this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question('📌 After authorizing, paste the authorization CODE from the URL:\n> ', async (code) => {
      rl.close();
      
      if (!code) {
        console.log('❌ No code provided');
        reject(new Error('No authorization code provided'));
        return;
      }

      try {
        console.log('\n🔄 Exchanging code for tokens...\n');
        const { tokens } = await oauth2Client.getToken(code);
        
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        
        console.log('✅ Success! Token saved to gmail_token.json\n');
        console.log('💾 Token Details:');
        console.log(`   - Access Token: ${tokens.access_token.substring(0, 20)}...`);
        console.log(`   - Refresh Token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'N/A'}`);
        console.log(`   - Expires: ${new Date(tokens.expiry_date).toLocaleString()}\n`);
        
        console.log('✨ Gmail is now ready to send emails!\n');
        resolve(tokens);
      } catch (error) {
        console.log('❌ Error exchanging code:', error.message);
        reject(error);
      }
    });
  });
}

authenticateGmailManual().catch(err => {
  console.error('Authorization failed:', err.message);
  process.exit(1);
});
