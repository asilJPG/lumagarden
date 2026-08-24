import menuData from "@/data/menu.json";
import type { Category, MenuData } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "lokmaco-uploads";

// Еда — своя, из репозитория: у ресторана собственное меню.
// Бар общий с The Lokmaco, поэтому напитки читаются из его menu.json напрямую.
// Так правка цен в админке Локмы меняет барную карту сразу на обоих сайтах,
// и второй копии, которая неизбежно разъедется, не появляется.
async function readSharedDrinks(): Promise<Category[]> {
  if (!SUPABASE_URL) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/menu.json`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const shared = (await res.json()) as MenuData;
    return shared.sections?.drinks ?? [];
  } catch (e) {
    // Бар недоступен — показываем одну еду. Падать целиком из-за напитков нельзя:
    // гость пришёл по QR с бумажного меню.
    console.error("readSharedDrinks failed:", e);
    return [];
  }
}

export async function readMenu(): Promise<MenuData> {
  const own = menuData as unknown as MenuData;
  return {
    ...own,
    sections: { food: own.sections.food, drinks: await readSharedDrinks() },
  };
}
