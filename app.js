const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome",
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1200 });
  try {
    await page.goto("https://mediamarkt.de/", { delay: getRandom() });
    const cookieAccept = await page.$("#privacy-layer-accept-all-button");
    await cookieAccept.click({ delay: getRandom() });

    const meinKontoBtn = await page.$(
      ".AppHeaderstyled__StyledContainer-sc-14r821q-2.dehVmy.MediaHide__Wrapped-fq7moe-0.gXvyJN"
    );
    await meinKontoBtn.click({ delay: getRandom() });
    const anmeldenBtn = await page.$$("#myaccount-dropdown-login-button");
    await anmeldenBtn[1].click({ delay: getRandom() });
    // await new Promise((r) => setTimeout(r, getRandom()));
    // await page.type("#mms-login-form__email-label", "rafa.dyrektorek@gmail.com");
    // await new Promise((r) => setTimeout(r, getRandom()));
    // await page.type("#mms-login-form__password", "NowaKarta123");
    // await new Promise((r) => setTimeout(r, getRandom()));
    // await page.focus("#mms-login-form__login-button");
    // page.keyboard.press("Enter");
    // await page.click("#mms-login-form__login-button", { delay: 300, force: true });
    await page.screenshot({ path: "img/example.png" });

    await browser.close();
  } catch (error) {
    console.log(error);
    await page.screenshot({ path: "img/error.png" });
    process.exit(1);
  }
})();

function getRandom() {
  const rand = Math.random() * (3 - 0.5) + 0.5;
  console.log(rand);
  return rand;
}
