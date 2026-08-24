"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Lang } from "@/lib/types";
import { LANGS, UI, formatPrice } from "@/lib/i18n";
import { BRAND } from "@/lib/brand";

interface Customer {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  balance: number;
}

function formatCardNumber(n: string): string {
  return n.replace(/(.{2})(.{4})(.{4})/, "$1 $2 $3");
}

function LoyaltyCard({ customer, lang }: { customer: Customer; lang: Lang }) {
  const t = UI[lang];
  const cardRef = useRef<HTMLDivElement>(null);

  // Премиальный 3D-tilt за курсором/пальцем
  const onMove = useCallback((e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    el.style.setProperty("--shine-x", `${(x + 0.5) * 100}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = cardRef.current;
    if (el) el.style.transform = "";
  }, []);

  return (
    <div className="loyalty-card__scene" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="loyalty-card" ref={cardRef}>
        <div className="loyalty-card__shine" />
        <div className="loyalty-card__top">
          <span className="loyalty-card__eyebrow">{t.card_eyebrow}</span>
          <span className="loyalty-card__logo">{BRAND.program.name}</span>
        </div>
        <div className="loyalty-card__balance">
          <span className="loyalty-card__balance-label">{t.card_balance}</span>
          <span className="loyalty-card__balance-value">
            {formatPrice(customer.balance)} <small>{t.card_bonuses}</small>
          </span>
        </div>
        <div className="loyalty-card__bottom">
          <div>
            <span className="loyalty-card__label">{t.card_holder}</span>
            <span className="loyalty-card__value">{customer.name.toUpperCase()}</span>
          </div>
          <div>
            <span className="loyalty-card__label">{t.card_number}</span>
            <span className="loyalty-card__value loyalty-card__value--num">
              {formatCardNumber(customer.cardNumber)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoyaltyProgram({ lang, onJoin }: { lang: Lang; onJoin?: () => void }) {
  const t = UI[lang];
  return (
    <div className="loyalty-program">
      <h2 className="lp-title">{t.card_rules_title}</h2>
      <p className="lp-venues">{t.card_venues}</p>
      <p className="lp-intro">{t.card_program_intro}</p>

      <div className="lp-section">
        <h3>{t.card_program_h_accrual}</h3>
        <p>{t.card_program_accrual}</p>
      </div>
      <div className="lp-section">
        <h3>{t.card_program_h_rules}</h3>
        <p>{t.card_program_rules}</p>
        <p className="lp-unit">{t.card_program_unit}</p>
        <p>{t.card_program_spend}</p>
      </div>
      <div className="lp-section">
        <h3>{t.card_program_h_birthday}</h3>
        <p>{t.card_program_birthday}</p>
      </div>

      {onJoin && (
        <button type="button" className="lp-join" onClick={onJoin}>{t.card_program_join}</button>
      )}
    </div>
  );
}

export default function CardApp() {
  const [lang, setLang] = useState<Lang>("ru");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [error, setError] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isIos, setIsIos] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const t = UI[lang];

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    }
    const saved = localStorage.getItem("lumagarden-lang");
    if (saved && LANGS.includes(saved as Lang)) setLang(saved as Lang);
    fetch("/api/card/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.customer) setCustomer(d.customer);
        setWalletEnabled(!!d?.walletEnabled);
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (customer && qrRef.current) {
      QRCode.toCanvas(qrRef.current, customer.cardNumber, {
        width: 208,
        margin: 1,
        color: { dark: BRAND.palette.text, light: "#ffffff" },
      });
    }
  }, [customer]);

  const switchLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lumagarden-lang", l);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/card/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.customer) {
        setCustomer(data.customer);
        setWalletEnabled(!!data.walletEnabled);
      } else setError(true);
    } catch (err) {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/card/me", { method: "DELETE" });
    } catch (err) {}
    setCustomer(null);
    setName("");
    setPhone("");
  };

  const addToWallet = async () => {
    setWalletBusy(true);
    setWalletError(null);
    try {
      const res = await fetch("/api/card/wallet", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) window.location.href = data.url;
      else setWalletError(data?.error === "wallet_not_configured" ? t.card_wallet_setup : t.card_wallet_error);
    } catch (err) {
      setWalletError(t.card_wallet_error);
    } finally {
      setWalletBusy(false);
    }
  };

  return (
    <div className="qr-shell card-shell">
      <header className="qr-header">
        <div className="brand-lockup">
          <span className="brand-lockup__eyebrow">{t.card_eyebrow}</span>
          <h1>{t.card_title}</h1>
        </div>
        <div className="lang-switcher">
          {LANGS.map((l) => (
            <button
              key={l}
              className={`lang-switcher__btn ${l === lang ? "active" : ""}`}
              onClick={() => switchLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <a className="card-back" href="/">{t.card_back}</a>

      {checking ? null : customer ? (
        <div className="card-view">
          <LoyaltyCard customer={customer} lang={lang} />

          <div className="card-qr-panel">
            <canvas ref={qrRef} className="card-qr-canvas" />
            <p className="card-qr-hint">{t.card_qr_hint}</p>
          </div>

          <LoyaltyProgram lang={lang} />

          <div className="card-pwa-block">
            <p>
              <span className="bullet">📱</span>
              <span>{isIos ? t.card_pwa_ios : t.card_pwa_android}</span>
            </p>
          </div>

          <button className="wallet-btn" onClick={addToWallet} disabled={walletBusy}>
            <span className="wallet-btn__icon">G</span>
            {walletBusy ? t.card_wallet_loading : t.card_wallet}
          </button>
          {walletError && <p className="card-error">{walletError}</p>}

          <button className="card-logout" onClick={logout}>{t.card_logout}</button>
        </div>
      ) : !showForm ? (
        <LoyaltyProgram lang={lang} onJoin={() => setShowForm(true)} />
      ) : (
        <>
          <form className="card-form" onSubmit={submit}>
            <p className="card-intro">{t.card_intro}</p>
          <label className="card-field">
            <span>{t.card_name}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </label>
          <label className="card-field">
            <span>{t.card_phone}</span>
            <div className="card-phone">
              <span className="card-phone__prefix">+998</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="90 123 45 67"
                required
              />
            </div>
          </label>
          {error && <p className="card-error">{t.card_error}</p>}
          <button className="card-submit" disabled={busy}>
            {busy ? t.card_loading : t.card_submit}
          </button>
          </form>
        </>
      )}
    </div>
  );
}
