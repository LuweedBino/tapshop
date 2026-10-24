import { Resend } from "resend";
import { env } from "./env";

type Mail = { to: string; subject: string; html: string };

export async function sendEmail(mail: Mail) {
  if (!env.resendApiKey) {
    console.log(`[email] (RESEND_API_KEY not set, not sending)\nTo: ${mail.to}\nSubject: ${mail.subject}\n${mail.html}`);
    return;
  }
  const { error } = await new Resend(env.resendApiKey).emails.send({ from: env.emailFrom, ...mail });
  if (error) console.error("[email] send failed", error);
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function deliveryEmail(opts: { buyerName: string; productTitle: string; creatorName: string; link: string }) {
  const hi = opts.buyerName ? `Hi ${escape(opts.buyerName)},` : "Hi,";
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px">
<p>${hi}</p>
<p>Thanks for getting <strong>${escape(opts.productTitle)}</strong> from ${escape(opts.creatorName)}.</p>
<p><a href="${opts.link}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Access your download</a></p>
<p style="color:#666;font-size:13px">Keep this email: the link above is how you get back to your file.</p>
</div>`;
}
