import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import bcrypt from "bcryptjs";
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { token, password } = body;

    if (!token || !password) {
      return res.status(400).json({ error: "Missing data" });
    }

    const users = await sql`
      SELECT * FROM users
      WHERE reset_token = ${token}
      AND reset_expires > NOW()
    `;

    const user = users[0];

    if (!user) {
      return res.status(400).json({ error: "Token invalid or expired" });
    }

    const hash = await bcrypt.hash(password, 10);

    await sql`
      UPDATE users
      SET password = ${hash},
          reset_token = NULL,
          reset_expires = NULL
      WHERE user_id = ${user.user_id}
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Reset failed" });
  }
}
