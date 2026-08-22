import { createHmac, timingSafeEqual } from "crypto";

// Подписанная cookie с id гостя — сессия карты лояльности без БД.
export const CARD_COOKIE = "lokmaco-card";

function secret(): string {
  return process.env.CARD_SECRET || process.env.ADMIN_PASSWORD || "lokmaco-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function sealCustomerId(id: string): string {
  return `${id}.${sign(id)}`;
}

export function unsealCustomerId(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const id = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(id);
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return id;
}
