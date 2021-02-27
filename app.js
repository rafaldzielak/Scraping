import e from "express";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import sendEmail from "./sendemail.js";
import colors from "colors";
import express from "express";

const app = express();

dotenv.config();

let currentAttempt = 0;
const knownLinks = [];

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});

app.get("/start", (req, res) => {
  if (currentAttempt > 0) return res.send("App is already running. Current attempt is: " + currentAttempt);
  startScript();
  res.status(200).send("App started. Check logs to be sure");
});

app.get("/keep-alive", (req, res) => {
  res.status(200).send(`Current attempt:  + ${currentAttempt}\n Current known links: ${knownLinks}`);
});

app.get("*", (req, res) => {
  res.send(
    "Send get request to: /start to start the app or to /keep-alive to keep app alive and check counter"
  );
});

const configPages = async () => {
  // const browser = await puppeteer.launch({
  //   executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome",
  // });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const pageMM = await configMMPage(
    browser,
    "https://www.mediamarkt.de/de/myaccount/auth/login?redirectURL=%2Fcheckout"
  );
  const pageSaturn = await configMMPage(
    browser,
    "https://www.saturn.de/de/myaccount/auth/login?redirectURL=%2Fcheckout"
  );

  const pageIdealo = await browser.newPage();
  const ipad = puppeteer.devices["iPad Pro"];
  await pageIdealo.setViewport({ width: 1200, height: 800 });
  await pageIdealo.emulate(ipad);

  return { pageMM, pageSaturn, pageIdealo };
};

const configMMPage = async (browser, pageUrl) => {
  const pageMM = await browser.newPage();
  const ipad = puppeteer.devices["iPad Pro"];
  await pageMM.emulate(ipad);
  await pageMM.goto(pageUrl);
  await pageMM.click("#privacy-layer-accept-all-button");
  await loginMMUser(pageMM);
  return pageMM;
};

const startScript = async () => {
  try {
    const { pageMM, pageSaturn, pageIdealo } = await configPages();

    while (true) {
      console.log(`Attempt number: ${++currentAttempt}`.grey.inverse);
      await getAvailableProductsFromMMCart(pageMM, knownLinks);
      await getAvailableProductsFromMMCart(pageSaturn, knownLinks);
      await checkIdealoForDeals(pageIdealo, knownLinks);
      await new Promise((r) => setTimeout(r, 30000));

      await pageMM.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
      await pageSaturn.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    }

    // await pageMM.screenshot({ path: "img/example.png" });

    await browser.close();
  } catch (error) {
    sendEmail("rafa.dyrektorek@gmail.com", `There was an error in the app`, error);
    console.log(error);
    // await pageMM.screenshot({ path: "img/error.png" });
    // process.exit(1);
  }
};

function getRandom() {
  const rand = Math.random() * (3 - 0.5) + 0.5;
  console.log(rand);
  return rand;
}

const loginMMUser = async (pageMM) => {
  const meinKontoBtn = await pageMM.waitForSelector(
    ".AppHeaderstyled__StyledContainer-sc-14r821q-2.dehVmy.MediaHide__Wrapped-fq7moe-0.gXvyJN"
  );
  // await meinKontoBtn.click();
  // const anmeldenBtn = await pageMM.$$("#myaccount-dropdown-login-button");
  // await anmeldenBtn[1].click();
  try {
    await pageMM.waitForSelector("#email", { timeout: 2000 });

    // await pageMM.waitForSelector("#mms-login-form__email-label");
    await pageMM.type("#email", "rafa.dyrektorek@gmail.com");
    await pageMM.type("#password", process.env.PASSWORD);
    // await pageMM.focus("#mms-login-form__login-button");
    await pageMM.click("#mms-login-form__login-button");
    await pageMM.waitForSelector(
      ".Cardstyled__StyledCardWrapper-sc-1b4w28x-6.bwRnrw.LineItemListstyled__StyledLineItemCard-sc-1mytme9-0.cQwFgU"
    );
  } catch (error) {
    // await pageMM.screenshot({ path: "img/MMERRROR.png" });
  }
  console.log("User logged successfully".green.inverse);
};

const getAvailableProductsFromMMCart = async (pageMM, knownLinks) => {
  const baseLink = pageMM.url().includes("saturn") ? "https://www.saturn.de" : "https://www.mediamarkt.de";
  console.log(`Checking ${baseLink}:`.yellow);
  const availableProducts = await pageMM.$$(
    ".Availabilitystyled__StyledAvailabilityStatus-sc-901vi5-1.heygcX"
  );
  const linksArray = [];
  if (availableProducts.length > 0) {
    // console.log(availableProducts);
    let emailText = "";
    for (let product of availableProducts) {
      let parent_node = await product.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      parent_node = await parent_node.getProperty("parentNode");
      // const anchor = await parent_node.$("a");
      // console.log(href);
      const linkToProduct = baseLink + (await getLinkFromAnchor(parent_node));
      // emailText += linkToProduct + "\n";
      linksArray.push(linkToProduct);
      console.log("\tPRODUCT AVAILABLE: " + linkToProduct);
      console.log("\t- " + (await getTextContentFromElement(pageMM, parent_node)));
    }
    for (let link of linksArray) {
      if (!knownLinks.includes(link)) {
        emailText += link + "\n";
        knownLinks.push(link);
      } else {
        console.log(`\t${link} was already sent in the email`);
      }
    }
    if (emailText) {
      sendEmail(
        "rafa.dyrektorek@gmail.com", //, mefiur95@gmail.com
        `${baseLink}: One or more of your wanted products is available!`,
        emailText
      );
    } else {
      console.log(`\tNo cards available in ${baseLink} cart, or the email was already sent!`);
    }
  } else {
    console.log(`\t ${baseLink}: There are no available products in cart.`);
  }
  // await pageMM.screenshot({ path: "img/MM.png" });
};

const getTextContentFromElement = async (page, element) => {
  let value = await page.evaluate((el) => el.textContent, element);
  return value;
};

const getLinkFromAnchor = async (page) => {
  const a = await page.$eval("a", (anchor) => anchor.getAttribute("href"));
  // console.log(a);
  return a;
};

const checkIdealoForDeals = async (pageIdealo, knownLinks) => {
  console.log("Checking idealo".blue);
  const idealoLinks = {
    amd5600xt:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1309393-100611441oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice",
    amd5700xt:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1309393-1335211oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice",
    amd6800:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F101603952oE0oJ1.html?sortKey=minPrice",
    nvidia2060:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1263422oE0oJ1.html?sortKey=minPrice",
    nvidia2080:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F873254oE0oJ1.html?sortKey=minPrice",
    nvidia3070:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F101483660oE0oJ1.html?sortKey=minPrice",
  };
  let emailText = "";
  const linksArray = [];

  for (const [name, link] of Object.entries(idealoLinks)) {
    await pageIdealo.goto(link);
    // await pageIdealo.screenshot({ path: "img/idealo.png" });
    const offerListItems = await pageIdealo.$$(".offerList-item");
    // if (offerListItems.length < 1) continue;
    for (let offerListItem of offerListItems) {
      if ((await getTextContentFromElement(offerListItem)).includes("gebraucht")) continue;
      const priceElement = await offerListItem.$(".offerList-item-priceMin");
      const priceBeforeWork = await getTextContentFromElement(priceElement);

      let price = priceBeforeWork.trim();
      if (price.includes("ab")) price = price.slice(3).trim().slice(0, -5);
      else price = price.trim().slice(0, -5);
      if (price.includes(".")) continue;
      switch (name) {
        case "amd5600xt":
          await checkIfElementWithinPriceLimit(offerListItem, price, 999);
          break;
        case "amd5700xt":
          await checkIfElementWithinPriceLimit(offerListItem, price, 999);
        case "amd6800":
          await checkIfElementWithinPriceLimit(offerListItem, price, 999);
        case "nvidia2060":
          await checkIfElementWithinPriceLimit(offerListItem, price, 450);
          break;
        case "nvidia2080":
          await checkIfElementWithinPriceLimit(offerListItem, price, 650);
        case "nvidia3070":
          await checkIfElementWithinPriceLimit(offerListItem, price, 750);
          break;
        default:
          break;
      }
    }

    async function checkIfElementWithinPriceLimit(offerListItem, price, priceLimit) {
      if (price < priceLimit) {
        // await pageIdealo.screenshot({ path: "img/idealo.png" });
        const elementWithinPriceLimit =
          `\t${price} €: https://www.idealo.de` + (await getLinkFromAnchor(offerListItem));
        // emailText += elementWithinPriceLimit;
        linksArray.push(elementWithinPriceLimit);
        console.log(elementWithinPriceLimit);
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
  for (let link of linksArray) {
    if (!knownLinks.includes(link)) {
      emailText += link + "\n";
      knownLinks.push(link);
    } else {
      console.log(`\t${link} was already sent in the email`);
    }
  }
  if (emailText) {
    // console.log("emailText:" + emailText);
    await sendEmail(
      "rafa.dyrektorek@gmail.com",
      "IDEALO: One or more of your wanted products is available!",
      emailText
    );
  } else {
    console.log("\tNo cards within price limit on Idealo, or the email was already sent!");
  }
};
