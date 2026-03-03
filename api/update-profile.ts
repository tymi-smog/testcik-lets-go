import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { resend } from "./lib/resend.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const users = await sql`
      SELECT * FROM users WHERE id = ${decoded.user_id}
    `;

    const user = users[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🔥 Jeśli email się NIE zmienił → zwykły update
    if (email === user.email) {
      await sql`
        UPDATE users
        SET username = ${username},
            updated_at = NOW()
        WHERE id = ${user.id}
      `;

      return res.status(200).json({ success: true });
    }

    // 🔐 Jeśli email się zmienił → generujemy token
    const changeToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await sql`
      UPDATE users
      SET username = ${username},
          pending_email = ${email},
          email_change_token = ${changeToken},
          email_change_expires = ${expires}
      WHERE id = ${user.id}
    `;

    const link = `${process.env.BASE_URL}/api/confirm-email-change?token=${changeToken}`;

    await resend.emails.send({
      from: "PanBilecik <onboarding@resend.dev>",
      to: email,
      subject: "Potwierdź zmianę emaila - PanBilecik",
      html: `
        <h2>Zmiana emaila</h2>
        <p>Kliknij poniżej aby potwierdzić zmianę:</p>
        <a href="${link}">${link}</a>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Wysłaliśmy email potwierdzający zmianę adresu.",
    });

  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token" });
  }
}
