// Outbound email. The constitution lists email as "not required for v1",
// so this stays provider-agnostic: if RESEND_API_KEY and EMAIL_FROM are
// set it sends through Resend's HTTP API (no extra dependency); otherwise
// it reports `sent: false` and the admin UI shows the invite link to copy.

export type EmailResult = { sent: boolean; error?: string };

export async function sendEmail(msg: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.log(`[email] not configured; would send to ${msg.to}: ${msg.subject}`);
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) {
      return { sent: false, error: `Email provider returned ${res.status}.` };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "Could not reach the email provider." };
  }
}

export function inviteEmail(opts: {
  role: string;
  url: string;
  inviterName: string | null;
  ttlDays: number;
}) {
  const who = opts.inviterName ?? "A Limber administrator";
  return {
    subject: "You're invited to Limber",
    text:
      `${who} invited you to join Limber as a ${opts.role}.\n\n` +
      `Create your account here:\n${opts.url}\n\n` +
      `This link works once and expires in ${opts.ttlDays} days.`,
  };
}
