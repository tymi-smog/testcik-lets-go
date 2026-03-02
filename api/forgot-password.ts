import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import { useState } from "react";
import crypto from "crypto";
import { resend } from "./lib/resend.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { email } = body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const users = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    const user = users[0];

    // 👇 ważne — NIE zdradzamy czy email istnieje
    if (!user) {
      return res.status(200).json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

await sql`
  UPDATE users
  SET reset_password_token = ${token},
      reset_password_expires = ${expires}
  WHERE id = ${user.id}
`;

    const link = `${process.env.BASE_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: "register@panbilecik.eu",
      to: email,
      subject: "Reset hasła - PanBilecik",
      html: `
        <h2>Reset hasła</h2>
        <h4>Kliknij aby ustawić nowe hasło:</h4>
        <a href="${link}">${link}</a>
        <p>Link jest ważny przez 30 minut.</p>

      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
}
