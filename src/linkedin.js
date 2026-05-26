const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, '../linkedin_session.json');
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(text) {
  return [...new Set((String(text || '').match(EMAIL_REGEX) || []).map(email => email.toLowerCase()))];
}

function hasAllKeywords(text, keywords) {
  const lowerText = String(text || '').toLowerCase();
  return keywords.every(keyword => lowerText.includes(String(keyword).toLowerCase()));
}

function isRecentLinkedInPost(text, maxAgeHours = 24) {
  const lowerText = String(text || '').toLowerCase();

  if (/\b(now|just now|minutes?|mins?|seconds?|secs?)\b/.test(lowerText)) return true;

  const hourMatch = lowerText.match(/\b(\d+)\s*(h|hr|hrs|hour|hours)\b/);
  if (hourMatch) return Number(hourMatch[1]) <= maxAgeHours;

  const dayMatch = lowerText.match(/\b(\d+)\s*(d|day|days)\b/);
  if (dayMatch) return Number(dayMatch[1]) < 1;

  return false;
}

async function searchLinkedIn(keywords) {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error('LinkedIn session not found. Run "npm run login" first.');
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    await context.addCookies(sessionData.cookies || []);

    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    const searchText = keywords.join(' ');
    const searchUrl = `https://www.linkedin.com/search/results/posts/?keywords=${encodeURIComponent(searchText)}&sortBy=DATE_POSTED`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const pageUrl = page.url();
    console.log(`[LinkedIn] Loaded URL: ${pageUrl}`);

    if (/\/login|uas\/login|checkpoint/.test(pageUrl)) {
      throw new Error('LinkedIn session expired. Run "npm run login" again.');
    }

    await page
      .waitForSelector('[data-id^="urn:li:activity:"], article, div[class*="feed-item"], div[class*="update"]', { timeout: 10000 })
      .catch(() => null);
    await page.waitForTimeout(2000);

    const posts = await page.evaluate(() => {
      const debug = {
        bodyClasses: document.body.className,
        allDivs: document.querySelectorAll('div').length,
        allArticles: document.querySelectorAll('article').length
      };

      let postElements = document.querySelectorAll('[data-id^="urn:li:activity:"]');
      debug.urnLiActivity = postElements.length;

      if (postElements.length === 0) postElements = document.querySelectorAll('article');
      debug.articles = postElements.length;

      if (postElements.length === 0) postElements = document.querySelectorAll('div[class*="feed-item"], div[class*="update"]');
      debug.feedFallback = postElements.length;

      const results = [];
      postElements.forEach((element) => {
        const postText = element.innerText || '';
        if (!postText.trim()) return;

        const lines = postText.split('\n').map(line => line.trim()).filter(Boolean);
        const recruiterName = lines[0]?.substring(0, 80) || 'Unknown';
        const linkElement =
          element.querySelector('a[href*="/posts/"]') ||
          element.querySelector('a[href*="/feed/update/"]') ||
          element.querySelector('a[href*="linkedin.com"]');

        results.push({
          postText,
          recruiterName,
          postUrl: linkElement?.href || window.location.href
        });
      });

      return { results, elementCount: postElements.length, debug };
    });

    console.log('[LinkedIn Search] Debug:', posts.debug);
    console.log(`[LinkedIn Search] Found ${posts.elementCount} elements`);

    const allResults = [];
    const seen = new Set();

    for (const post of posts.results) {
      if (!hasAllKeywords(post.postText, keywords)) continue;
      if (!isRecentLinkedInPost(post.postText, 24)) continue;

      const emails = extractEmails(post.postText);
      for (const email of emails) {
        const key = `${email}|${post.postUrl}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const firstMeaningfulLine = post.postText
          .split('\n')
          .map(line => line.trim())
          .find(line => hasAllKeywords(line, keywords));

        allResults.push({
          recruiterName: post.recruiterName,
          recruiterEmail: email,
          jobTitle: (firstMeaningfulLine || 'Job Opportunity').substring(0, 120),
          postText: post.postText.substring(0, 700),
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

module.exports = { extractEmails, hasAllKeywords, isRecentLinkedInPost, searchLinkedIn };
