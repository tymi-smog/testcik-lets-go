import jwt from "jsonwebtoken";
import { sql } from "./db.js";
import { ensureUserBanColumns } from "./user-bans.js";

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function resolveUserById(userId) {
  await ensureUserBanColumns();

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `;

  const columnNames = new Set(columns.map((column) => String(column.column_name)));
  const hasUserId = columnNames.has("user_id");
  const hasId = columnNames.has("id");
  const idColumn = hasUserId ? "user_id" : hasId ? "id" : null;

  if (!idColumn) {
    return null;
  }

  if (idColumn === "user_id") {
    const users = await sql`
      SELECT user_id, username, email, is_verified, is_admin, ban_until, ban_reason, banned_at
      FROM users
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return users[0] ?? null;
  }

  const users = await sql`
    SELECT id, username, email, is_verified, is_admin, ban_until, ban_reason, banned_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  return users[0] ?? null;
}

function normalizeIsVerified(value) {
  return value === true || value === "t" || value === 1 || value === "1";
}

function normalizeBanUntil(value) {
  return value ? String(value) : null;
}

function normalizeIsBanned(value) {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) && parsed > Date.now();
}

export async function authenticateRequest(req) {
  const token = readBearerToken(req);
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  const userId = Number(decoded.userId ?? decoded.user_id);
  if (!userId) {
    return null;
  }

  const userRow = await resolveUserById(userId);
  if (!userRow) {
    return null;
  }

  return {
    userId: Number(userRow.user_id ?? userRow.id),
    username: String(userRow.username),
    email: String(userRow.email),
    is_verified: normalizeIsVerified(userRow.is_verified),
    is_admin: userRow.is_admin === true || userRow.is_admin === "t",
    is_banned: normalizeIsBanned(userRow.ban_until),
    ban_until: normalizeBanUntil(userRow.ban_until),
    ban_reason: userRow.ban_reason ? String(userRow.ban_reason) : null,
    banned_at: userRow.banned_at ? String(userRow.banned_at) : null,
  };
}

export function rejectIfBannedUser(authUser, res) {
  if (authUser?.is_banned) {
    res.status(403).json({
      error: "Konto jest zablokowane.",
      ban_until: authUser.ban_until,
      ban_reason: authUser.ban_reason,
      banned_at: authUser.banned_at,
    });
    return true;
  }

  return false;
}
