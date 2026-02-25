import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { token } = req.query;

    console.log("VERIFY TOKEN:", token);

    if (!token || typeof token !== "string") {
      return res.status(400).send("Invalid token");
    }

    // sprawdź czy user istnieje
    const user = await sql`
      SELECT user_id FROM users
      WHERE verification_token = ${token}
    `;

    if (!user.length) {
      return res.status(400).send("Token not found");
    }

    // aktywuj konto
    await sql`
      UPDATE users
      SET is_verified = true,
          verification_token = NULL
      WHERE verification_token = ${token}
    `;

    console.log("USER VERIFIED");

    // redirect na login
    return res.redirect("/login?verified=true");

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).send("Verify failed");
  }
}
