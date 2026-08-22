import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.metadata.cardTitle,
    short_name: BRAND.metadata.shortName,
    description: BRAND.metadata.cardDescription,
    start_url: "/card",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND.palette.bg,
    theme_color: BRAND.palette.deep,
    // Иконок пока нет: логотип Luma Garden не предоставлен, а брать иконки
    // The Lokmaco нельзя. Без них установка PWA работает, но без своего значка.
    icons: [],
  };
}
