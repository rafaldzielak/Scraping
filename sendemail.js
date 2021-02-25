import nodeoutlook from "nodejs-nodemailer-outlook";
import dotenv from "dotenv";

dotenv.config();

export default function sendEmail(receiver, subject, text) {
  nodeoutlook.sendEmail({
    auth: {
      user: "rafa.dyrektorek@outlook.com",
      pass: process.env.PASSWORD,
    },
    from: "rafa.dyrektorek@outlook.com",
    to: receiver,
    subject,
    text,
    onError: (e) => console.log(e),
    onSuccess: (i) => console.log("Email sent"),
  });
}
// sendEmail("rafa.dyrektorek@gmail.com", "AAAA", "aa");
