console.log("API FILE LOADED");
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { resend } from "./lib/resend.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("REGISTER API HIT");
  console.log("BODY:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const { username, email, password } = body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existing = await sql`
      SELECT user_id FROM users WHERE email = ${email}
    `;

    if (existing.length) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");

    await sql`
      INSERT INTO users (username, email, password, verification_token)
      VALUES (${username}, ${email}, ${hash}, ${token})
    `;

    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL env missing");
    }

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Potwierdź konto",
      html: `
        <h2>Witaj ${username} 👋</h2>
        <p>Kliknij aby aktywować konto:</p>
        <a href="${process.env.BASE_URL}/api/verify?token=${token}">
          Potwierdź konto
        </a>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Register failed" });
  }
}
