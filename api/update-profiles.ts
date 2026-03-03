import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import jwt from "jsonwebtoken";

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

    await sql`
      UPDATE users
      SET username = ${username},
          email = ${email},
          updated_at = NOW()
      WHERE id = ${decoded.user_id}
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token" });
  }
}
