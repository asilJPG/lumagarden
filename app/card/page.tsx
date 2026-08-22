import type { Metadata } from "next";
import CardApp from "@/components/CardApp";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND.metadata.cardTitle,
  description: BRAND.metadata.cardDescription,
};

export default function Page() {
  return <CardApp />;
}
