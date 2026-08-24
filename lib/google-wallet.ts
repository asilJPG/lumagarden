import { createSign } from "crypto";
import type { LoyaltyCustomer } from "./loyalty";

const SAVE_URL = "https://pay.google.com/gp/v/save";

interface WalletConfig {
  issuerId: string;
  classSuffix: string;
  clientEmail: string;
  privateKey: string;
  // Может отсутствовать: origin берётся из запроса, env — только запасной вариант.
  origin: string | null;
  logoUrl: string | null;
}

export function googleWalletConfigured(): boolean {
  return !!(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_CLIENT_EMAIL &&
    process.env.GOOGLE_WALLET_PRIVATE_KEY
  );
}

function getConfig(): WalletConfig {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || null;
  if (!issuerId || !clientEmail || !privateKey) {
    throw new Error("Google Wallet env is not configured");
  }
  return {
    issuerId,
    clientEmail,
    origin,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    classSuffix: process.env.GOOGLE_WALLET_CLASS_SUFFIX || "lokmaco_loyalty",
    logoUrl: process.env.GOOGLE_WALLET_LOGO_URL || null,
  };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function localized(value: string) {
  return {
    defaultValue: {
      language: "ru-RU",
      value,
    },
  };
}

function walletImage(uri: string, description: string) {
  return {
    sourceUri: { uri },
    contentDescription: localized(description),
  };
}

function safeSuffix(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

// Google проверяет, что страница, с которой жмут «Сохранить», указана в origins.
// Сайтов два (Lokmaco и Luma Garden), класс карты один — поэтому список, а не строка.
function walletOrigins(config: WalletConfig, requestOrigin?: string | null): string[] {
  const list: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    try {
      const origin = new URL(value).origin;
      if (!list.includes(origin)) list.push(origin);
    } catch {
      // Некорректный URL молча пропускаем, иначе кнопка отвалится целиком.
    }
  };
  push(requestOrigin);
  push(config.origin);
  return list;
}

function signJwt(payload: object, privateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  return `${unsigned}.${signature.toString("base64url")}`;
}

export function createGoogleWalletLink(
  customer: LoyaltyCustomer,
  requestOrigin?: string | null
): string {
  const config = getConfig();
  const classId = `${config.issuerId}.${safeSuffix(config.classSuffix)}`;
  const objectId = `${config.issuerId}.customer_${safeSuffix(customer.id)}`;
  const origins = walletOrigins(config, requestOrigin);
  const now = Math.floor(Date.now() / 1000);

  // Класс общий с The Lokmaco — намеренно: второй класс означал бы вторую,
  // не связанную программу, и у гостей отвалились бы карты.
  // ВАЖНО: ровно такой же issuerName должен отправлять деплой lokmaco-qr.
  // Класс один, и та отправка, что пришла последней, перезаписывает название.
  const loyaltyClass = {
    id: classId,
    issuerName: "The Lokmaco · Luma Garden",
    reviewStatus: "UNDER_REVIEW",
    programName: "Бонусная карта",
    hexBackgroundColor: "#3B2416",
    ...(config.logoUrl
      ? { programLogo: walletImage(config.logoUrl, "Логотип программы лояльности") }
      : {}),
  };

  const loyaltyObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountId: customer.cardNumber,
    accountName: customer.name,
    barcode: {
      type: "QR_CODE",
      value: customer.cardNumber,
      alternateText: customer.cardNumber,
    },
    loyaltyPoints: {
      label: "Бонусы",
      balance: { int: Math.max(0, Math.floor(customer.balance)) },
    },
    textModulesData: [
      {
        id: "RULES",
        header: "Правила накопления",
        body: "Кэшбэк с каждого заказа: 3% от 300 000 до 700 000, 5% от 700 000 до 1 500 000, 7% от 1 500 000 сум и выше.\n1 бонус = 1 сум. Оплата бонусами до 50% чека.\nДень рождения: 15% кэшбэк за 5 дней до и 10 дней после.",
      },
      {
        id: "PHONE",
        header: "Телефон",
        body: customer.phone,
      },
    ],
  };

  const jwt = signJwt(
    {
      iss: config.clientEmail,
      aud: "google",
      typ: "savetowallet",
      iat: now,
      origins,
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
      },
    },
    config.privateKey
  );

  return `${SAVE_URL}/${jwt}`;
}
