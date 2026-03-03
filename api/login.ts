import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function toBoolean(value: unknown): boolean {
  return value === true || value === "t" || value === 1 || value === "1";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET is missing" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email, password } = body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const users = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: "Nieprawidlowy login" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Nieprawidlowe haslo" });
    }

    const resolvedUserId = Number(user.user_id ?? user.id);
    const isVerified = toBoolean(user.is_verified);
    const isAdmin = toBoolean(user.is_admin);

    const token = jwt.sign(
      {
        userId: resolvedUserId,
        user_id: resolvedUserId,
        username: user.username,
        email: user.email,
        is_verified: isVerified,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      user: {
        userId: resolvedUserId,
        username: user.username,
        email: user.email,
        is_verified: isVerified,
        is_admin: isAdmin,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
