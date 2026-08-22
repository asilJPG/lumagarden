import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Гость программы лояльности.
export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  balance: number;
  createdAt: string;
}

const IIKO_API_KEY = process.env.IIKO_API_KEY;
const IIKO_APP_ID = process.env.IIKO_APP_ID;
const IIKO_CLIENT_SECRET = process.env.IIKO_CLIENT_SECRET;
const IIKO_ORGANIZATION_ID = process.env.IIKO_ORGANIZATION_ID;

// Проверяем, заданы ли все параметры авторизации iiko API v2
export const usingIiko = !!(IIKO_API_KEY && IIKO_APP_ID && IIKO_CLIENT_SECRET && IIKO_ORGANIZATION_ID);

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // Узбекский номер: 9 цифр после кода страны 998
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return null;
}

function makeCardNumber(): string {
  // 10 цифр, префикс 77 — чтобы кассир отличал карты Lokmaco
  let n = "77";
  for (let i = 0; i < 8; i++) n += Math.floor(Math.random() * 10);
  return n;
}

/* ---------- iiko API v2 client ---------- */

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getIikoToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const res = await fetch("https://api-ru.iiko.services/api/v2/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: IIKO_API_KEY,
      appId: IIKO_APP_ID,
      clientSecret: IIKO_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to authenticate with iiko API v2: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 3600 * 1000; // Токен действует 1 час
  return cachedToken!;
}

async function iikoFetch<T>(endpoint: string, body: any): Promise<T> {
  const token = await getIikoToken();
  const res = await fetch(`https://api-ru.iiko.services/api/1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`iiko API error on ${endpoint}: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function iikoGetCustomer(type: "phone" | "id", value: string): Promise<LoyaltyCustomer | null> {
  try {
    const data = await iikoFetch<any>("loyalty/iiko/customer/info", {
      type,
      [type]: value,
      organizationId: IIKO_ORGANIZATION_ID,
    });

    if (!data || !data.id) return null;

    // Ищем первую активную карту лояльности
    const cardNumber = data.cards && data.cards[0] ? data.cards[0].number : "";

    // Суммируем баланс всех кошельков
    let balance = 0;
    if (data.walletBalances && data.walletBalances.length > 0) {
      for (const w of data.walletBalances) {
        if (w.balance) balance += w.balance;
      }
    }

    return {
      id: data.id,
      name: data.name || "",
      phone: data.phone || "",
      cardNumber,
      balance: Math.round(balance),
      createdAt: data.whenRegistered || new Date().toISOString(),
    };
  } catch (err: any) {
    // Если клиент не найден, iiko вернет ошибку Transport_WrongCustomerNumber
    if (err.message && (err.message.includes("Transport_WrongCustomerNumber") || err.message.includes("Validation_IncorrectPhone"))) {
      return null;
    }
    throw err;
  }
}

async function enrollInActivePrograms(customerId: string) {
  try {
    const progData = await iikoFetch<{ Programs: any[] }>("loyalty/iiko/program", {
      organizationId: IIKO_ORGANIZATION_ID,
    });
    if (progData.Programs && progData.Programs.length > 0) {
      for (const program of progData.Programs) {
        if (program.isActive && program.id) {
          await iikoFetch<any>("loyalty/iiko/customer/program/add", {
            organizationId: IIKO_ORGANIZATION_ID,
            customerId,
            programId: program.id,
          }).catch((e) => {
            // Игнорируем ошибку, если пользователь уже добавлен в программу
            console.warn(`Program enrollment notice for ${program.id}:`, e.message || e);
          });
        }
      }
    }
  } catch (progErr) {
    console.error("Failed to fetch programs or enroll customer:", progErr);
  }
}

async function iikoGetOrCreate(phone: string, name: string): Promise<LoyaltyCustomer> {
  const existing = await iikoGetCustomer("phone", phone);
  if (existing) {
    // Если пользователь существует, но у него нет карты в iiko, создадим её
    if (!existing.cardNumber) {
      const cardNum = makeCardNumber();
      await iikoFetch<any>("loyalty/iiko/customer/create_or_update", {
        organizationId: IIKO_ORGANIZATION_ID,
        id: existing.id,
        phone,
        name,
        cardNumber: cardNum,
        cardTrack: cardNum,
      });
      existing.cardNumber = cardNum;
    }
    // Всегда проверяем и подключаем бонусные программы для существующих
    await enrollInActivePrograms(existing.id);
    const updated = await iikoGetCustomer("id", existing.id);
    return updated || existing;
  }

  // Создаем нового клиента с новой картой
  const cardNum = makeCardNumber();
  const createResult = await iikoFetch<{ id: string }>("loyalty/iiko/customer/create_or_update", {
    organizationId: IIKO_ORGANIZATION_ID,
    phone,
    name,
    cardNumber: cardNum,
    cardTrack: cardNum,
  });

  const customerId = createResult.id;

  // Подписываем нового гостя на бонусные программы
  await enrollInActivePrograms(customerId);

  // Получаем и возвращаем созданного клиента
  const created = await iikoGetCustomer("id", customerId);
  if (created) return created;

  return {
    id: customerId,
    name,
    phone,
    cardNumber: cardNum,
    balance: 0,
    createdAt: new Date().toISOString(),
  };
}

/* ---------- mock (локально, пока нет iiko API env) ---------- */

const MOCK_PATH = path.join(process.cwd(), "data/customers.json");
const memory: Record<string, LoyaltyCustomer> = {};

async function mockRead(): Promise<Record<string, LoyaltyCustomer>> {
  try {
    return JSON.parse(await fs.readFile(MOCK_PATH, "utf-8"));
  } catch {
    return { ...memory };
  }
}

async function mockWrite(all: Record<string, LoyaltyCustomer>) {
  Object.assign(memory, all);
  try {
    await fs.writeFile(MOCK_PATH, JSON.stringify(all, null, 2) + "\n", "utf-8");
  } catch {
    // В Vercel файловая система read-only
  }
}

async function mockGetOrCreate(phone: string, name: string): Promise<LoyaltyCustomer> {
  const all = await mockRead();
  const existing = Object.values(all).find((c) => c.phone === phone);
  if (existing) return existing;
  const customer: LoyaltyCustomer = {
    id: randomUUID(),
    name,
    phone,
    cardNumber: makeCardNumber(),
    balance: 0,
    createdAt: new Date().toISOString(),
  };
  all[customer.id] = customer;
  await mockWrite(all);
  return customer;
}

async function mockGetById(id: string): Promise<LoyaltyCustomer | null> {
  return (await mockRead())[id] ?? null;
}

/* ---------- public API ---------- */

export async function getOrCreateCustomer(phone: string, name: string): Promise<LoyaltyCustomer> {
  return usingIiko ? iikoGetOrCreate(phone, name) : mockGetOrCreate(phone, name);
}

export async function getCustomerById(id: string): Promise<LoyaltyCustomer | null> {
  return usingIiko ? iikoGetCustomer("id", id) : mockGetById(id);
}
