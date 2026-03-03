import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Invalid token" });
  }

  const users = await sql`
    SELECT * FROM users
    WHERE email_change_token = ${token}
      AND email_change_expires > NOW()
  `;

  const user = users[0];

  if (!user) {
    return res.status(400).send("Token wygasł lub jest nieprawidłowy.");
  }

  await sql`
    UPDATE users
    SET email = pending_email,
        pending_email = NULL,
        email_change_token = NULL,
        email_change_expires = NULL
    WHERE id = ${user.id}
  `;

  return res.redirect("/profile");
}
