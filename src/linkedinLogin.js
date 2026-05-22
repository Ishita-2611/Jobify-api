const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SESSION_FILE = path.join(__dirname, '../linkedin_session.json');

async function saveLinkedInSession() {
  console.log('🔐 LinkedIn Session Saver');
  console.log('==========================\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Auto-fill if credentials are in .env
    const linkedinEmail = process.env.LINKEDIN_EMAIL;
    const linkedinPass = process.env.LINKEDIN_PASS;

    if (linkedinEmail && linkedinPass) {
      console.log('📝 Auto-filling LinkedIn credentials from .env...\n');
      
      try {
        // Wait for email field and fill
        await page.waitForSelector('input[name="session_key"]', { timeout: 5000 });
        await page.fill('input[name="session_key"]', linkedinEmail);
        console.log('✓ Email filled');
        
        // Wait for password field and fill
        await page.waitForSelector('input[name="session_password"]', { timeout: 5000 });
        await page.fill('input[name="session_password"]', linkedinPass);
        console.log('✓ Password filled');
        
        // Click sign in button
        await page.click('button[type="submit"]');
        console.log('✓ Clicking sign in...\n');

        // Wait for redirect to dashboard (successful login)
        try {
          await page.waitForURL(/linkedin\.com\/(feed|mynetwork)/, { timeout: 15000 });
          console.log('✓ Successfully logged in!\n');
        } catch {
          console.log('⚠️  Login may need additional verification (2FA, captcha, etc.)');
          console.log('    Waiting for manual navigation...\n');
        }
      } catch (fillError) {
        console.log('⚠️  Could not auto-fill form. Please log in manually.\n');
        console.log('Error details:', fillError.message);
      }
    } else {
      console.log('📋 Please log in manually to LinkedIn.\n');
    }

    console.log('Waiting for you to complete login...\n');
    console.log('Press ENTER in this terminal after you\'ve logged in successfully.\n');
    
    // Wait for user to press ENTER
    await new Promise(resolve => {
      const rl = readline.createInterface({ input: process.stdin });
      rl.question('', resolve);
      rl.close();
    });

    // Save cookies
    const cookies = await context.cookies();
    const sessionData = {
      cookies,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`\n✅ Session saved to ${SESSION_FILE}`);

    await context.close();
  } catch (error) {
    console.error('❌ Error saving session:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  saveLinkedInSession().then(() => {
    console.log('\n✨ Ready! Run "npm start" to launch the server.');
    process.exit(0);
  });
}

module.exports = { saveLinkedInSession };
