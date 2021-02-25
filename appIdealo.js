import e from "express";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import sendEmail from "./sendemail.js";

dotenv.config();

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome",
  });
  const pageIdealo = await browser.newPage();

  await pageIdealo.setViewport({ width: 1200, height: 800 });
  console.log(pageIdealo.viewport());
  const idealoLinks = {
    amd5600xt:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1309393-100611441oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice",
    amd5700xt:
      "https://www.idealo.de/preisvergleich/ProductCategory/16073F1309393-1335211oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice",
  };

  try {
    let index = 0;
    while (true) {
      let emailText = "";
      for (const [name, link] of Object.entries(idealoLinks)) {
        await pageIdealo.goto(link);
        const offerListItem = await pageIdealo.$(".offerList-item");
        if (!offerListItem) continue;
        const priceElement = await offerListItem.$(".offerList-item-priceMin");
        const priceBeforeWork = await getTextContentFromElement(priceElement);

        const price = priceBeforeWork.trim().slice(3).trim().slice(0, -5);
        switch (name) {
          case "amd5600xt":
            if (price < 400) {
              const elementWithinPrice =
                `${price} €: https://www.idealo.de/` + (await getLinkFromAnchor(offerListItem));
              emailText += elementWithinPrice;
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
        // console.log("Number of attempts: " + ++index);
      }
      if (emailText) {
        await sendEmail(
          "rafa.dyrektorek@gmail.com, mefiur95@gmail.com",
          "IDEALO: One or more of your wanted products is available!",
          emailText
        );
      }
      await new Promise((r) => setTimeout(r, 30000));
      // await pageIdealo.screenshot({ path: "img/example.png" });
    }

    await browser.close();
  } catch (error) {
    console.log(error);
    await pageIdealo.screenshot({ path: "img/error.png" });
    process.exit(1);
  }
})();

const getTextContentFromElement = async (page, element) => {
  let value = await page.evaluate((el) => el.textContent);
  return value;
};

const getLinkFromAnchor = async (page) => {
  const a = await page.$eval("a", (anchor) => anchor.getAttribute("href"));
  // console.log(a);
  return a;
};
