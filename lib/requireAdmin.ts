import jwt from "jsonwebtoken";
import { sql } from "./db.js";

export async function requireAdmin(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.split(" ")[1];
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

  const users = await sql`
    SELECT is_admin, ban_until FROM users WHERE id = ${decoded.user_id}
  `;

  if (!users[0] || !users[0].is_admin) {
    throw new Error("Forbidden");
  }

  if (users[0].ban_until && new Date(users[0].ban_until).getTime() > Date.now()) {
    throw new Error("Forbidden");
  }

  return decoded;
}
