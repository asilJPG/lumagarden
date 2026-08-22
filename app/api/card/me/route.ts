import { NextRequest, NextResponse } from "next/server";
import { getCustomerById } from "@/lib/loyalty";
import { googleWalletConfigured } from "@/lib/google-wallet";
import { CARD_COOKIE, unsealCustomerId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const id = unsealCustomerId(req.cookies.get(CARD_COOKIE)?.value);
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const customer = await getCustomerById(id);
    if (!customer) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, customer, walletEnabled: googleWalletConfigured() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CARD_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
