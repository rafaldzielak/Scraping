import e from "express";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import sendEmail from "./sendemail.js";

dotenv.config();

const configPages = async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome",
  });
  const pageMM = await configMMPage(browser);

  const pageIdealo = await browser.newPage();
  const ipad = puppeteer.devices["iPad Pro"];
  await pageIdealo.setViewport({ width: 1200, height: 800 });
  await pageIdealo.emulate(ipad);

  return { pageMM, pageIdealo };
};

const configMMPage = async (browser) => {
  const pageMM = await browser.newPage();
  const ipad = puppeteer.devices["iPad Pro"];
  await pageMM.emulate(ipad);
  await pageMM.goto("https://www.mediamarkt.de/checkout");
  await pageMM.click("#privacy-layer-accept-all-button");
  await loginUser(pageMM);
  return pageMM;
};

(async () => {
  try {
    const { pageMM, pageIdealo } = await configPages();

    let index = 0;
    while (true) {
      console.log("Attempt number: " + ++index);
      await getAvailableProductsFromMMCart(pageMM);
      await checkIdealoForDeals(pageIdealo);
      await new Promise((r) => setTimeout(r, 30000));

      await pageMM.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    }

    await pageMM.screenshot({ path: "img/example.png" });

    await browser.close();
  } catch (error) {
    console.log(error);
    await pageMM.screenshot({ path: "img/error.png" });
    process.exit(1);
  }
})();

function getRandom() {
  const rand = Math.random() * (3 - 0.5) + 0.5;
  console.log(rand);
  return rand;
}

const loginUser = async (pageMM) => {
  const meinKontoBtn = await pageMM.waitForSelector(
    ".AppHeaderstyled__StyledContainer-sc-14r821q-2.dehVmy.MediaHide__Wrapped-fq7moe-0.gXvyJN"
  );
  await meinKontoBtn.click();
  const anmeldenBtn = await pageMM.$$("#myaccount-dropdown-login-button");
  await anmeldenBtn[1].click();
  try {
    await pageMM.waitForSelector("#mms-login-form__email-label");
  } catch (error) {
    await pageMM.screenshot({ path: "img/MMERRROR.png" });
  }
  await pageMM.waitForSelector("#mms-login-form__email-label");
  await pageMM.type("#mms-login-form__email-label", "rafa.dyrektorek@gmail.com");
  await pageMM.type("#mms-login-form__password", process.env.PASSWORD);
  await pageMM.focus("#mms-login-form__login-button");
  await pageMM.click("#mms-login-form__login-button");
  await pageMM.waitForSelector(
    ".Cardstyled__StyledCardWrapper-sc-1b4w28x-6.bwRnrw.LineItemListstyled__StyledLineItemCard-sc-1mytme9-0.cQwFgU"
  );
  console.log("User logged successfully");
};

const getAvailableProductsFromMMCart = async (pageMM) => {
  const availableProducts = await pageMM.$$(
    ".Availabilitystyled__StyledAvailabilityStatus-sc-901vi5-1.heygcX"
  );
  if (availableProducts.length > 0) {
    console.log(availableProducts);
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
      console.log(await getTextContentFromElement(pageMM, parent_node));
    }
    sendEmail(
      "rafa.dyrektorek@gmail.com, mefiur95@gmail.com",
      "One or more of your wanted products is available!",
      emailText
    );
  } else {
    console.log("MediaMarkt: There are no available products in cart.");
  }
  await pageMM.screenshot({ path: "img/MM.png" });
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

const checkIdealoForDeals = async (pageIdealo) => {
  console.log("Checking idealo");
  const idealoLinks = {
    amd5600xt:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1309393-100611441oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice",
    amd5700xt:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1309393-1335211oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice",
  };
  let emailText = "";
  for (const [name, link] of Object.entries(idealoLinks)) {
    await pageIdealo.goto(link);
    await pageIdealo.screenshot({ path: "img/idealo.png" });
    const offerListItem = await pageIdealo.$(".offerList-item");
    if (!offerListItem) continue;
    const priceElement = await offerListItem.$(".offerList-item-priceMin");
    const priceBeforeWork = await getTextContentFromElement(priceElement);

    const price = priceBeforeWork.trim().slice(3).trim().slice(0, -5);
    switch (name) {
      case "amd5600xt":
        if (price < 400) {
          const elementWithinPriceLimit =
            `${price} €: https://www.idealo.de/` + (await getLinkFromAnchor(offerListItem));
          emailText += elementWithinPriceLimit;
          console.log(elementWithinPriceLimit);
        }

        break;
      case "amd5700xt":
        if (price < 450) {
          const elementWithinPrice =
            `${price} €: https://www.idealo.de/` + (await getLinkFromAnchor(offerListItem));
          emailText += elementWithinPrice;
        }
      default:
        break;
    }
    await new Promise((r) => setTimeout(r, 2000));
    // console.log("Number of attempts: " + ++index);
  }
  if (emailText) {
    await sendEmail(
      "rafa.dyrektorek@gmail.com, mefiur95@gmail.com",
      "IDEALO: One or more of your wanted products is available!",
      emailText
    );
  } else {
    console.log("No cards within price limit on Idealo");
  }
};
