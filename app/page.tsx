import MenuApp from "@/components/MenuApp";
import MenuUnavailable from "@/components/MenuUnavailable";
import { readMenu } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  try {
    const menu = await readMenu();
    return <MenuApp menu={menu} />;
  } catch (e) {
    console.error("readMenu failed:", e);
    return <MenuUnavailable />;
  }
}
