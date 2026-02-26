import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // tylko POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vercel czasem daje body jako string
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // pobierz usera z bazy
    const users = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: "Nieprawidłowy login" });
    }

    // sprawdź hasło
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Nieprawidłowy login" });
    }

    // generuj JWT
    const token = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ token });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
