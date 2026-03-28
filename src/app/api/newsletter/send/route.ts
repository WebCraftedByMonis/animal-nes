import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { subject, message, previewText } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    // Collect emails from users and newsletter subscribers only
    const [newsletterSubs, users] = await Promise.all([
      (prisma as any).newsletterSubscriber.findMany({ select: { email: true, name: true } }),
      prisma.user.findMany({ where: { email: { not: null } }, select: { email: true, name: true } }),
    ]);

    // Merge and deduplicate by email
    const emailMap = new Map<string, string>();
    for (const s of newsletterSubs) if (s.email) emailMap.set(s.email.toLowerCase(), s.name || "");
    for (const u of users) if (u.email) emailMap.set(u.email.toLowerCase(), u.name || "");

    const allRecipients = [...emailMap.entries()].map(([email, name]) => ({ email, name }));

    if (!allRecipients.length) {
      return NextResponse.json({ error: "No email addresses found in database" }, { status: 400 });
    }

    const subscribers = allRecipients;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#16a34a;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">🐾 AnimalWellness</h1>
      ${previewText ? `<p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">${previewText}</p>` : ""}
    </div>
    <!-- Body -->
    <div style="padding:40px;color:#374151;font-size:15px;line-height:1.7;">
      ${message.replace(/\n/g, "<br/>")}
    </div>
    <!-- Footer -->
    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You are receiving this because you subscribed to AnimalWellness newsletters.<br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?email={{EMAIL}}" style="color:#16a34a;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < subscribers.length; i += 10) {
      const batch = subscribers.slice(i, i + 10);
      await Promise.all(batch.map(async (sub: any) => {
        try {
          await transporter.sendMail({
            from: `"AnimalWellness" <${process.env.EMAIL_USER}>`,
            to: sub.email,
            subject,
            html: htmlBody.replace("{{EMAIL}}", encodeURIComponent(sub.email)),
          });
          sent++;
        } catch (e: any) {
          failed++;
          errors.push(`${sub.email}: ${e.message}`);
        }
      }));
      // Small delay between batches
      if (i + 10 < subscribers.length) await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json({ success: true, sent, failed, errors: errors.slice(0, 5) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
