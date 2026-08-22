import MenuApp from "@/components/MenuApp";
import { readMenu } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const menu = await readMenu();
  return <MenuApp menu={menu} />;
}
