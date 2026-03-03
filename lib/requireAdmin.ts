import jwt from "jsonwebtoken";
import { sql } from "./db.js";

export async function requireAdmin(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.split(" ")[1];
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

  const users = await sql`
    SELECT is_admin FROM users WHERE id = ${decoded.user_id}
  `;

  if (!users[0] || !users[0].is_admin) {
    throw new Error("Forbidden");
  }

  return decoded;
}
