import { NextResponse } from "next/server";
import { readMenu } from "@/lib/store";

export const dynamic = "force-dynamic";

// Диагностика конфигурации. Отдаёт только факт «задано / не задано» —
// значения переменных наружу не уходят.
export async function GET() {
  const set = (name: string) => !!process.env[name];

  const env = {
    // Меню лежит в репозитории, внешнее хранилище для него не нужно.
    iiko: {
      IIKO_API_KEY: set("IIKO_API_KEY"),
      IIKO_APP_ID: set("IIKO_APP_ID"),
      IIKO_CLIENT_SECRET: set("IIKO_CLIENT_SECRET"),
      IIKO_ORGANIZATION_ID: set("IIKO_ORGANIZATION_ID"),
    },
    wallet: {
      GOOGLE_WALLET_ISSUER_ID: set("GOOGLE_WALLET_ISSUER_ID"),
      GOOGLE_WALLET_CLIENT_EMAIL: set("GOOGLE_WALLET_CLIENT_EMAIL"),
      GOOGLE_WALLET_PRIVATE_KEY: set("GOOGLE_WALLET_PRIVATE_KEY"),
      GOOGLE_WALLET_CLASS_SUFFIX: process.env.GOOGLE_WALLET_CLASS_SUFFIX || "lokmaco_loyalty (по умолчанию)",
    },
    site: {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      CARD_SECRET: set("CARD_SECRET"),
    },
  };

  const data = await readMenu();
  const cats = [...data.sections.food, ...data.sections.drinks];
  const menu = {
    ok: true,
    categories: cats.length,
    items: cats.reduce((n, c) => n + c.items.length, 0),
  };

  return NextResponse.json({ ok: true, menu, env });
}
