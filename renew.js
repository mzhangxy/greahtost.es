  const { chromium } = require("playwright");

  (async () => {
  const LOGIN_URL = process.env.GH_LOGIN_URL || "https://greathost.es/login";
  const CONTRACT_URL = process.env.GH_CONTRACT_URL;
  const EMAIL = process.env.GH_EMAIL;
  const PASSWORD = process.env.GH_PASSWORD;

  if (!CONTRACT_URL || !EMAIL || !PASSWORD) {
    console.error("缺少必要的环境变量");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ]
  });

  const context = await browser.newContext();
  await context.addInitScript(() => {
    delete navigator.__proto__.webdriver;
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  try {
    console.log("打开登录页：", LOGIN_URL);
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.screenshot({ path: "login-filled.png" });

    // 点击登录
    await page.click('button[type="submit"]');

    // 等待登录结果
    try {
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      console.log("登录成功，进入 dashboard");
    } catch {
      await page.screenshot({ path: "login-timeout.png" });
      console.error("登录超时，可能有验证码或网络问题");
      process.exit(1);
    }

    // 后续操作...
    console.log("打开合约页：", CONTRACT_URL);
    await page.goto(CONTRACT_URL, { waitUntil: "networkidle" });

    await page.click('button:has-text("续期"), button:has-text("Renew")');
    console.log("已点击续期按钮");

    await page.waitForSelector('.alert-success, text=续期成功', { timeout: 15000 });
    console.log("续期成功！");
    await browser.close();
    process.exit(0);

  } catch (err) {
    await page.screenshot({ path: "final-error.png" });
    console.error("脚本出错：", err.message);
    await browser.close();
    process.exit(2);
  }
})();
