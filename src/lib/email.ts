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

export function inquiryEmail(opts: { name: string; email: string; company: string; budget: string; message: string; creatorName: string; link: string }) {
  const row = (label: string, value: string) => (value ? `<p style="margin:4px 0"><strong>${label}:</strong> ${escape(value)}</p>` : "");
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px">
<p>Hi ${escape(opts.creatorName)}, a brand reached out through your portfolio.</p>
${row("Name", opts.name)}${row("Email", opts.email)}${row("Company", opts.company)}${row("Budget", opts.budget)}
<p style="white-space:pre-line;background:#f5f5f5;padding:12px 16px;border-radius:10px">${escape(opts.message)}</p>
<p>Reply to <a href="mailto:${escape(opts.email)}">${escape(opts.email)}</a>, or see all inquiries in <a href="${opts.link}">your dashboard</a>.</p>
</div>`;
}
