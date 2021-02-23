import e from "express";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import sendEmail from "./sendemail.js";

dotenv.config();

const ipad = puppeteer.devices["iPad Pro"];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome",
  });
  const page = await browser.newPage();
  // await page.setViewport({ width: 1680, height: 1050 });
  await page.emulate(ipad);
  try {
    await page.goto("https://www.mediamarkt.de/checkout");
    await page.click("#privacy-layer-accept-all-button");
    await loginUser(page);
    getAvailableProductsFromCart(page);

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

const loginUser = async (page) => {
  const meinKontoBtn = await page.$(
    ".AppHeaderstyled__StyledContainer-sc-14r821q-2.dehVmy.MediaHide__Wrapped-fq7moe-0.gXvyJN"
  );
  await meinKontoBtn.click();
  const anmeldenBtn = await page.$$("#myaccount-dropdown-login-button");
  await anmeldenBtn[1].click();
  await page.type("#mms-login-form__email-label", "rafa.dyrektorek@gmail.com");
  await page.type("#mms-login-form__password", process.env.PASSWORD);
  await page.focus("#mms-login-form__login-button");
  await page.click("#mms-login-form__login-button");
  await page.waitForSelector(
    ".Cardstyled__StyledCardWrapper-sc-1b4w28x-6.bwRnrw.LineItemListstyled__StyledLineItemCard-sc-1mytme9-0.cQwFgU"
  );
  console.log("User logged successfully");
};

const getAvailableProductsFromCart = async (page) => {
  const availableProducts = await page.$$(".Availabilitystyled__StyledAvailabilityStatus-sc-901vi5-1.heygcX");
  if (availableProducts) {
    let emailText = "Check this out:\n";
    for (let product of availableProducts) {
      let parent_node = await product.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      const anchor = await parent_node.$("a");
      // console.log(href);
      const linkToProduct = "https://www.mediamarkt.de" + (await getLinkFromAnchor(parent_node));
      emailText += linkToProduct + "\n";
      console.log("PRODUCT AVAILABLE: " + linkToProduct);
      console.log(await getTextContentFromElement(page, parent_node));
    }
    sendEmail("rafa.dyrektorek@gmail.com", "One or more of your wanted products is available!", emailText);
  }
};

const getTextContentFromElement = async (page, element) => {
  let value = await page.evaluate((el) => el.textContent, element);
  return value;
};

const getLinkFromAnchor = async (page) => {
  const a = await page.$eval("a", (anchor) => anchor.getAttribute("href"));
  console.log(a);
  return a;
};
