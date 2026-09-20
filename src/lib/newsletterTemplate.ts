// Wraps the plain text marketing staff type (blank line = new paragraph) in a
// minimal branded HTML email — email clients don't reliably load custom web
// fonts, so this sticks to a generic sans-serif stack rather than Sen.
export function buildNewsletterHtml(bodyText: string): string {
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#253844;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('\n');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f1e9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1e9;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fffdfb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#5bc5ce;padding:24px 32px;">
                <img src="https://rmqfvhethwzzmsamkoam.supabase.co/storage/v1/object/public/email-assets/logo-white.png" width="150" alt="sochill Bath Club" style="display:block;width:150px;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${paragraphs}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <a href="https://sochillbathclub.com" style="display:inline-block;background:#f4864e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">Visit Sochill Bath Club</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;border-top:1px solid #ece4d6;">
                <p style="margin:16px 0 0;font-size:12px;color:#8a97a0;">Sochill Bath Club · Raffles Holland V Mall, #02-01, 118 Holland Ave, Singapore 278997</p>
                <p style="margin:4px 0 0;font-size:12px;color:#8a97a0;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8a97a0;">Unsubscribe</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
