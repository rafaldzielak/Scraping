import nodeoutlook from "nodejs-nodemailer-outlook";
import dotenv from "dotenv";

dotenv.config();

// nodeoutlook.sendEmail({
//     auth: {
//         user: "rafa.dyrektorek@outlook.com",
//         pass: "NowaKarta123"
//     },
//     from: 'rafa.dyrektorek@outlook.com',
//     to: 'rafa.dyrektorek@gmail.com',
//     subject: 'Hey you, awesome!',
//     html: '<b>This is bold text</b>',
//     text: 'This is text version!',
//     replyTo: 'receiverXXX@gmail.com',
//     onError: (e) => console.log(e),
//     onSuccess: (i) => console.log(i)
// }
// );

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
    onSuccess: (i) => console.log(i),
  });
}
// sendEmail("rafa.dyrektorek@gmail.com", "AAAA", "aa");
