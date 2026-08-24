import menuData from "@/data/menu.json";
import type { MenuData } from "./types";

// Меню Luma Garden лежит в репозитории. Supabase-бакет Локмы больше не читается:
// у ресторана своё меню, пересечений с кондитерской нет.
// Правка позиций и цен = правка data/menu.json и redeploy.
export async function readMenu(): Promise<MenuData> {
  return menuData as unknown as MenuData;
}
