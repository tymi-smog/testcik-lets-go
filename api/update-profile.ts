import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import crypto from "crypto";
import { resend } from "../lib/resend.js";
import { authenticateRequest } from "../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authUser = await authenticateRequest(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const username = String(body?.username ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!username || !email) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const users = await sql`
      SELECT * FROM users WHERE email = ${authUser.email} LIMIT 1
    `;

    const user = users[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUsername = String(user.username ?? "");
    const currentEmail = String(user.email ?? "").toLowerCase();
    const usernameChanged = username !== currentUsername;
    const emailChanged = email !== currentEmail;

    if (!usernameChanged && !emailChanged) {
      return res.status(200).json({ success: true, message: "Brak zmian." });
    }

    if (!emailChanged) {
      await sql`
        UPDATE users
        SET username = ${username},
            updated_at = NOW()
        WHERE email = ${currentEmail}
      `;

      if (usernameChanged) {
        await resend.emails.send({
          from: "register@panbilecik.eu",
          to: currentEmail,
          subject: "Potwierdzenie zmiany nazwy uzytkownika - PanBilecik",
          html: `
            <h2>Zmiana nazwy uzytkownika zostala zapisana</h2>
            <p>Nowa nazwa konta: <strong>${username}</strong></p>
          `,
        });
      }

      return res.status(200).json({
        success: true,
        message: usernameChanged
          ? "Nazwa uzytkownika zostala zapisana, wyslalismy potwierdzenie e-mail."
          : "Dane zostaly zaktualizowane.",
      });
    }

    const changeToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30);

    await sql`
      UPDATE users
      SET username = ${username},
          pending_email = ${email},
          email_change_token = ${changeToken},
          email_change_expires = ${expires},
          updated_at = NOW()
      WHERE email = ${currentEmail}
    `;

    const link = `${process.env.BASE_URL}/api/confirm-email-change?token=${changeToken}`;

    await resend.emails.send({
      from: "PanBilecik <onboarding@resend.dev>",
      to: email,
      subject: "Potwierdz zmiane emaila - PanBilecik",
      html: `
        <h2>Zmiana emaila</h2>
        <p>Kliknij ponizej aby potwierdzic zmiane:</p>
        <a href="${link}">${link}</a>
      `,
    });

    if (usernameChanged) {
      await resend.emails.send({
        from: "register@panbilecik.eu",
        to: currentEmail,
        subject: "Potwierdzenie zmiany nazwy uzytkownika - PanBilecik",
        html: `
          <h2>Zmiana nazwy uzytkownika zostala zapisana</h2>
          <p>Nowa nazwa konta: <strong>${username}</strong></p>
        `,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wyslalismy email potwierdzajacy zmiane adresu.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}
