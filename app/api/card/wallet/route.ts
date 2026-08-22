import { NextRequest, NextResponse } from "next/server";
import { createGoogleWalletLink, googleWalletConfigured } from "@/lib/google-wallet";
import { getCustomerById } from "@/lib/loyalty";
import { CARD_COOKIE, unsealCustomerId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const id = unsealCustomerId(req.cookies.get(CARD_COOKIE)?.value);
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  if (!googleWalletConfigured()) {
    return NextResponse.json({ ok: false, error: "wallet_not_configured" }, { status: 501 });
  }

  try {
    const customer = await getCustomerById(id);
    if (!customer) return NextResponse.json({ ok: false }, { status: 401 });
    // Домен, с которого гость реально нажал кнопку, — его и заявляем в origins.
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const requestOrigin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : req.nextUrl.origin;
    return NextResponse.json({ ok: true, url: createGoogleWalletLink(customer, requestOrigin) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
