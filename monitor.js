const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

const URLS = [
  "https://www.avstwiki.org/main",
  "https://www.avstwiki.org/uni/general-info",
  "https://www.avstwiki.org/uni/faq",
  "https://www.avstwiki.org/uni/uni-wien",
  "https://www.avstwiki.org/uni/wu-wien",
  "https://www.avstwiki.org/uni/tu-wien",
  "https://www.avstwiki.org/uni/uni-graz",
  "https://www.avstwiki.org/uni/tu-graz",
  "https://www.avstwiki.org/uni/jku-linz",
  "https://www.avstwiki.org/uni/aau-klagenfurt",
  "https://www.avstwiki.org/uni/innsbruck",
  "https://www.avstwiki.org/uni/salzburg",
  "https://www.avstwiki.org/uni/meduni",
  "https://www.avstwiki.org/vid-na-zhitelstvo-i-viza/plan",
  "https://www.avstwiki.org/vid-na-zhitelstvo-i-viza/calculator",
  "https://www.avstwiki.org/vid-na-zhitelstvo-i-viza/poda4a",
  "https://www.avstwiki.org/vid-na-zhitelstvo-i-viza/visa-d",
  "https://www.avstwiki.org/apostille",
  "https://www.avstwiki.org/apostille/russia",
  "https://www.avstwiki.org/checklist",
  "https://www.avstwiki.org/after-arrival",
  "https://www.avstwiki.org/legal-questions-RF",
  "https://www.avstwiki.org/employment",
  "https://www.avstwiki.org/employment/poisk",
  "https://www.avstwiki.org/employment/dienstvertrag",
  "https://www.avstwiki.org/housing-situation",
  "https://www.avstwiki.org/housing-situation/obshagi",
  "https://www.avstwiki.org/housing-situation/kvartiry",
  "https://www.avstwiki.org/medical-care",
  "https://www.avstwiki.org/transportation",
  "https://www.avstwiki.org/banking",
  "https://www.avstwiki.org/phone-internet",
  "https://www.avstwiki.org/preparation-courses/epd-exam",
  "https://www.avstwiki.org/preparation-courses/registering",
  "https://www.avstwiki.org/language",
  "https://www.avstwiki.org/vid-na-zhitelstvo-i-viza/prodlenije",
  "https://www.avstwiki.org/vid-na-zhitelstvo-i-viza/bjurokratija",
  "https://www.avstwiki.org/lifehacks/university-tips"
];

const HASHES_FILE = 'hashes.json';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function loadHashes() {
  try {
    return JSON.parse(fs.readFileSync(HASHES_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveHashes(hashes) {
  fs.writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2));
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sendTelegram(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(body);
        } else {
          console.error(`Telegram API error: ${res.statusCode} ${body}`);
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getPageName(url) {
  const path = new URL(url).pathname;
  return path === '/' || path === '/main' ? 'Главная' : path.split('/').pop();
}

async function main() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    process.exit(1);
  }

  const oldHashes = loadHashes();
  const newHashes = {};
  const changes = [];
  const errors = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const url of URLS) {
    try {
      await page.goto(url, { timeout: 30000, waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Get main content text, skip navigation
      const text = await page.evaluate(() => {
        const main = document.querySelector('[role="main"]') || document.body;
        return main.innerText || '';
      });

      const currentHash = hash(text);
      newHashes[url] = currentHash;

      if (oldHashes[url] && oldHashes[url] !== currentHash) {
        changes.push(url);
        console.log(`CHANGED: ${url}`);
      } else if (!oldHashes[url]) {
        console.log(`NEW: ${url}`);
      } else {
        console.log(`OK: ${url}`);
      }
    } catch (e) {
      console.error(`ERROR: ${url} - ${e.message}`);
      errors.push(url);
      if (oldHashes[url]) {
        newHashes[url] = oldHashes[url];
      }
    }
  }

  await browser.close();
  saveHashes(newHashes);

  if (changes.length > 0) {
    let msg = `<b>avstwiki.org — обновления</b>\n\n`;
    for (const url of changes) {
      const name = getPageName(url);
      msg += `• <a href="${url}">${name}</a>\n`;
    }
    msg += `\n<i>${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</i>`;
    await sendTelegram(msg);
    console.log(`Sent notification: ${changes.length} changes`);
  } else {
    console.log('No changes detected');
  }

  if (errors.length > 0) {
    console.log(`Errors on ${errors.length} pages (kept old hashes)`);
  }
}

main().catch(console.error);
