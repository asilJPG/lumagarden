import type { Metadata } from "next";
import MenuApp from "@/components/MenuApp";
import { readMenu } from "@/lib/store";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: BRAND.metadata.menuTitle,
  description: BRAND.metadata.menuDescription,
};

export default async function MenuPage() {
  const menu = await readMenu();
  return <MenuApp menu={menu} />;
}
