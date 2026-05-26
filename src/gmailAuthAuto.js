require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');

const TOKEN_PATH = 'gmail_token.json';
const CREDS = require('../credentials.json').installed;

async function authenticateGmailAuto() {
  console.log('🔐 Starting Automated Gmail Authorization...\n');
  
  const oauth2Client = new google.auth.OAuth2(
    CREDS.client_id,
    CREDS.client_secret,
    'http://localhost:5500/oauth2callback'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/oauth2callback')) {
        const url = new URL(req.url, 'http://localhost:5500');
        const code = url.searchParams.get('code');

        if (code) {
          console.log('✅ Authorization code received!\n');
          
          try {
            const { tokens } = await oauth2Client.getToken(code);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            
            console.log('💾 Gmail token saved to gmail_token.json\n');
            console.log('✨ Gmail is now ready to send emails automatically!\n');
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .box { background: white; padding: 40px; border-radius: 10px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
                    h1 { color: #667eea; margin: 0 0 10px 0; }
                    p { color: #666; font-size: 16px; }
                    .success { color: #4CAF50; font-size: 48px; }
                  </style>
                </head>
                <body>
                  <div class="box">
                    <div class="success">✅</div>
                    <h1>Authorization Complete!</h1>
                    <p>Gmail is now connected and ready to send emails.</p>
                    <p>You can close this window and return to the terminal.</p>
                  </div>
                </body>
              </html>
            `);
            
            server.close();
            resolve(tokens);
          } catch (error) {
            res.writeHead(400);
            res.end(`Error: ${error.message}`);
            server.close();
            reject(error);
          }
        } else {
          res.writeHead(400);
          res.end('Authorization code not found');
          server.close();
          reject(new Error('No authorization code received'));
        }
      }
    });

    server.listen(5500, async () => {
      console.log('🌐 Opening authorization page in browser...\n');
      console.log('📋 If the browser doesn\'t open automatically,');
      console.log('   visit this URL:\n');
      console.log(`   ${authUrl}\n`);
      
      try {
        const open = (await import('open')).default;
        await open(authUrl);
      } catch (error) {
        console.log('⚠️  Could not auto-open browser. Please visit the URL above manually.\n');
      }
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err.message);
      reject(err);
    });
  });
}

// Run if called directly
if (require.main === module) {
  authenticateGmailAuto()
    .then(() => {
      console.log('🎉 Gmail setup complete! You can now use /api/apply to send emails.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { authenticateGmailAuto };
