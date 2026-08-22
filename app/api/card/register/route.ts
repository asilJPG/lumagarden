import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCustomer, normalizePhone } from "@/lib/loyalty";
import { googleWalletConfigured } from "@/lib/google-wallet";
import { CARD_COOKIE, sealCustomerId } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    const trimmedName = String(name ?? "").trim();
    if (!normalized || trimmedName.length < 2) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }
    const customer = await getOrCreateCustomer(normalized, trimmedName);
    const res = NextResponse.json({ ok: true, customer, walletEnabled: googleWalletConfigured() });
    res.cookies.set(CARD_COOKIE, sealCustomerId(customer.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
