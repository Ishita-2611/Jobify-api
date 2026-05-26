require('dotenv').config();

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

    console.log(`📧 Email detected: ${linkedinEmail ? '✓' : '✗'}`);
    console.log(`🔑 Password detected: ${linkedinPass ? '✓' : '✗'}\n`);

    if (linkedinEmail && linkedinPass) {
      console.log('📝 Auto-filling LinkedIn credentials from .env...\n');
      
      try {
        // Wait for email field - try multiple selectors
        let emailField = null;
        const emailSelectors = [
          'input[name="session_key"]',
          'input[id="username"]',
          'input[aria-label*="Email"]',
          'input[type="email"]'
        ];

        for (const selector of emailSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            emailField = selector;
            break;
          } catch {
            // Continue to next selector
          }
        }

        if (!emailField) {
          throw new Error('Could not find email field with any known selector');
        }

        await page.fill(emailField, linkedinEmail);
        console.log('✓ Email filled');
        
        // Wait for password field - try multiple selectors
        let passwordField = null;
        const passwordSelectors = [
          'input[name="session_password"]',
          'input[id="password"]',
          'input[type="password"]'
        ];

        for (const selector of passwordSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            passwordField = selector;
            break;
          } catch {
            // Continue to next selector
          }
        }

        if (!passwordField) {
          throw new Error('Could not find password field with any known selector');
        }

        await page.fill(passwordField, linkedinPass);
        console.log('✓ Password filled');
        
        // Click sign in button - try multiple selectors
        const signInSelectors = [
          'button[type="submit"]',
          'button:has-text("Sign in")',
          'button:has-text("Continue")',
          'button[aria-label*="Sign in"]'
        ];

        for (const selector of signInSelectors) {
          try {
            await page.click(selector);
            console.log('✓ Clicking sign in...\n');
            break;
          } catch {
            // Continue to next selector
          }
        }

        // Wait for redirect to dashboard (successful login)
        let loginSuccess = false;
        try {
          await page.waitForURL(/linkedin\.com\/(feed|mynetwork)/, { timeout: 15000 });
          console.log('✓ Successfully logged in!\n');
          loginSuccess = true;
        } catch {
          console.log('⚠️  Login may need additional verification (2FA, captcha, etc.)');
          console.log('    Waiting for manual navigation for 30 seconds...\n');
          
          // Wait 30 seconds for manual 2FA/captcha
          try {
            await page.waitForURL(/linkedin\.com\/(feed|mynetwork)/, { timeout: 30000 });
            loginSuccess = true;
            console.log('✓ Successfully logged in!\n');
          } catch {
            console.log('❌ Login verification timeout.\n');
          }
        }
        
        if (loginSuccess) {
          // Auto-save without waiting for user input
          console.log('💾 Auto-saving session...\n');
        }
      } catch (fillError) {
        console.log('⚠️  Could not auto-fill form. Please log in manually.\n');
        console.log('Error details:', fillError.message);
        console.log('\nWaiting 60 seconds for manual login...\n');
        
        // Wait 60 seconds for manual login
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } else {
      console.log('📋 Please log in manually to LinkedIn.\n');
      console.log('Waiting 120 seconds for manual login...\n');
      
      // Wait 120 seconds for manual login
      await new Promise(resolve => setTimeout(resolve, 120000));
    }

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
  saveLinkedInSession().then(() => {
    console.log('\n✨ Ready! Run "npm start" to launch the server.');
    process.exit(0);
  });
}

module.exports = { saveLinkedInSession };
