const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, '../linkedin_session.json');

async function searchLinkedIn(keywords) {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error('LinkedIn session not found. Run "npm run login" first.');
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();


    // Load saved session
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    await context.addCookies(sessionData.cookies);
    if (sessionData.storageState) {
      await context.addInitScript(() => {
        // Restore local/session storage if needed
      });
    }

    const page = await context.newPage();

    // Search LinkedIn posts for each keyword
    const allResults = [];
    const keywords_str = keywords.join(' OR ');

    // LinkedIn search URL (posts from last 24 hours)
    const searchUrl = `https://www.linkedin.com/search/results/posts/?keywords=${encodeURIComponent(keywords_str)}&sortBy=DATE_POSTED`;
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for posts to load
    await page.waitForSelector('div[data-component-type="feed"]', { timeout: 10000 }).catch(() => null);

    // Extract posts
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll('[data-id^="urn:li:activity:"]');
      const results = [];

      postElements.forEach((element) => {
        const postText = element.innerText || '';
        
        // Try to find email in post text
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = postText.match(emailRegex) || [];
        
        // Extract recruiter name (usually in post header)
        const headerElement = element.querySelector('[aria-label*="posted"]');
        let recruiterName = headerElement?.innerText?.split('\n')[0] || 'Unknown';

        // Get post URL
        const linkElement = element.querySelector('a[href*="/posts/"]') || element.querySelector('a[href*="/feed/"]');
        const postUrl = linkElement?.href || window.location.href;

        results.push({
          postText,
          recruiterName,
          emails,
          postUrl
        });
      });

      return results;
    });

    // Format results
    for (const post of posts) {
      if (post.emails.length > 0) {
        for (const email of post.emails) {
          allResults.push({
            recruiterName: post.recruiterName,
            recruiterEmail: email,
            jobTitle: post.postText.split('\n')[0].substring(0, 100) || 'Job Opportunity',
            postText: post.postText.substring(0, 500),
            postUrl: post.postUrl
          });
        }
      } else {
        allResults.push({
          recruiterName: post.recruiterName,
          recruiterEmail: 'N/A',
          jobTitle: post.postText.split('\n')[0].substring(0, 100) || 'Job Opportunity',
          postText: post.postText.substring(0, 500),
          postUrl: post.postUrl
        });
      }
    }

    await context.close();
    return allResults;

  } catch (error) {
    throw new Error(`LinkedIn scrape failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { searchLinkedIn };
