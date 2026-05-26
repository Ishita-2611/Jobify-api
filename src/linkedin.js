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

    // Set longer timeout for page loads
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Search LinkedIn posts for each keyword
    const allResults = [];
    const keywords_str = keywords.join(' OR ');

    // LinkedIn search URL (posts from last 24 hours)
    const searchUrl = `https://www.linkedin.com/search/results/posts/?keywords=${encodeURIComponent(keywords_str)}&sortBy=DATE_POSTED`;
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait a bit more for dynamic content
    await page.waitForTimeout(3000);
    
    // Check if we're logged in or redirected
    const pageUrl = page.url();
    console.log(`[LinkedIn] Loaded URL: ${pageUrl}`);
    
    // Try various waits for post elements
    await page.waitForSelector('div[class*="feed"], article, [data-id^="urn:li:activity:"], div[data-component-type="feed"]', { timeout: 5000 }).catch(() => null);
    
    // Wait for posts to load
    await page.waitForTimeout(2000);

    // Extract posts with fallback selectors
    const posts = await page.evaluate(() => {
      const results = [];
      const debug = {};
      
      // Log page structure
      debug.bodyClasses = document.body.className;
      debug.allDivs = document.querySelectorAll('div').length;
      debug.allArticles = document.querySelectorAll('article').length;
      
      // Try multiple selectors for posts
      let postElements = document.querySelectorAll('[data-id^="urn:li:activity:"]');
      debug.urnLiActivity = postElements.length;
      
      // Fallback if no posts found with above selector
      if (postElements.length === 0) {
        postElements = document.querySelectorAll('div[class*="feed-item"]');
        debug.feedItem = postElements.length;
      }
      
      // Another fallback
      if (postElements.length === 0) {
        postElements = document.querySelectorAll('article');
        debug.articles = postElements.length;
      }
      
      // Try searching for containers with text content
      if (postElements.length === 0) {
        postElements = document.querySelectorAll('div[data-component-type*="feed"], div[class*="update"]');
        debug.feedComponent = postElements.length;
      }
      
      debug.totalElements = postElements.length;

      postElements.forEach((element, index) => {
        const postText = element.innerText || '';
        
        if (!postText.trim()) return;
        
        // Try to find email in post text
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = postText.match(emailRegex) || [];
        
        // Extract recruiter name (usually in post header or first line)
        let recruiterName = 'Unknown';
        const lines = postText.split('\n');
        if (lines.length > 0) {
          recruiterName = lines[0].substring(0, 50) || 'Unknown';
        }

        // Get post URL
        const linkElement = element.querySelector('a[href*="/posts/"]') || 
                          element.querySelector('a[href*="/feed/"]') ||
                          element.querySelector('a[href*="linkedin"]');
        const postUrl = linkElement?.href || window.location.href;

        if (emails.length > 0) {
          results.push({
            postText: postText.substring(0, 200),
            recruiterName,
            emails,
            postUrl
          });
        }
      });

      return { results, pageTitle: document.title, elementCount: postElements.length, debug };
    });

    console.log(`[LinkedIn Search] Debug:`, posts.debug);
    console.log(`[LinkedIn Search] Found ${posts.elementCount} elements, ${posts.results.length} with emails`);
    
    // Format results
    for (const post of posts.results) {
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
