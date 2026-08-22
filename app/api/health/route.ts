import { NextResponse } from "next/server";
import { readMenu } from "@/lib/store";

export const dynamic = "force-dynamic";

// Диагностика конфигурации. Отдаёт только факт «задано / не задано» —
// значения переменных наружу не уходят.
export async function GET() {
  const set = (name: string) => !!process.env[name];

  const env = {
    supabase: {
      SUPABASE_URL: set("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: set("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "lokmaco-uploads (по умолчанию)",
    },
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

  let menu: { ok: boolean; categories?: number; items?: number; error?: string };
  try {
    const data = await readMenu();
    const cats = [...data.sections.food, ...data.sections.drinks];
    menu = {
      ok: true,
      categories: cats.length,
      items: cats.reduce((n, c) => n + c.items.length, 0),
    };
  } catch (e) {
    menu = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ ok: menu.ok, menu, env }, { status: menu.ok ? 200 : 503 });
}
