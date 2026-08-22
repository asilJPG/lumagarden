import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { MenuData } from "./types";

const MENU_KEY = "menu.json";
const MENU_LOCAL_PATH = "data/menu.json";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "lokmaco-uploads";

// Всё меню + фото/видео — Supabase Storage. Локально без Supabase → файл.
const useSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

const supabase = () =>
  createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false } });

const menuPublicUrl = () =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${MENU_KEY}`;

export async function readMenu(): Promise<MenuData> {
  if (useSupabase) {
    const res = await fetch(menuPublicUrl(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Supabase read menu.json: ${res.status}`);
    return res.json();
  }
  const raw = await fs.readFile(path.join(process.cwd(), MENU_LOCAL_PATH), "utf-8");
  return JSON.parse(raw);
}

export async function writeMenu(menu: MenuData): Promise<void> {
  const json = JSON.stringify(menu, null, 2) + "\n";
  if (useSupabase) {
    const { error } = await supabase()
      .storage.from(BUCKET)
      .upload(MENU_KEY, Buffer.from(json, "utf-8"), {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });
    if (error) throw new Error(`Supabase write menu.json: ${error.message}`);
    return;
  }
  await fs.writeFile(path.join(process.cwd(), MENU_LOCAL_PATH), json, "utf-8");
}

const contentTypeFor = (fileName: string): string => {
  const ext = fileName.split(".").pop()!.toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

export async function writeImage(fileName: string, base64: string): Promise<string> {
  if (useSupabase) {
    const { error } = await supabase()
      .storage.from(BUCKET)
      .upload(fileName, Buffer.from(base64, "base64"), {
        contentType: contentTypeFor(fileName),
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) throw new Error(`Supabase upload ${fileName}: ${error.message}`);
    const publicUrl = supabase().storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
    // Версионный параметр — обходит браузерный кэш и CDN если файл перезаписан.
    return `${publicUrl}?v=${Date.now()}`;
  }
  const abs = path.join(process.cwd(), "public/uploads", fileName);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from(base64, "base64"));
  return `/uploads/${fileName}`;
}
