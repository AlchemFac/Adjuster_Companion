// Development-only browser driver. The application itself has no dependencies.
const { existsSync } = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
module.exports.chromium = {
  launch: () => playwright.chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
  }),
};
