import type { Metadata } from "next";
import MenuApp from "@/components/MenuApp";
import MenuUnavailable from "@/components/MenuUnavailable";
import { readMenu } from "@/lib/store";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: BRAND.metadata.menuTitle,
  description: BRAND.metadata.menuDescription,
};

export default async function MenuPage() {
  try {
    const menu = await readMenu();
    return <MenuApp menu={menu} />;
  } catch (e) {
    console.error("readMenu failed:", e);
    return <MenuUnavailable />;
  }
}
