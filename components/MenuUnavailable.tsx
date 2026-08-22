import { BRAND } from "@/lib/brand";

// Меню приходит из Supabase на каждый запрос. Если чтение упало, гость с бумажным
// QR не должен упираться в системную страницу ошибки — показываем своё сообщение.
export default function MenuUnavailable() {
  return (
    <main className="qr-shell">
      <header className="qr-header">
        <div className="brand-lockup">
          <span className="brand-lockup__eyebrow">МЕНЮ</span>
          <h1>{BRAND.name}</h1>
        </div>
      </header>

      <section className="guest-menu">
        <div className="no-results">
          Меню временно недоступно. Обновите страницу через минуту
          или попросите меню у официанта.
        </div>
      </section>

      <a className="card-banner" href="/card">
        <span className="card-banner__star" aria-hidden>✦</span>
        <span className="card-banner__text">Бонусная карта</span>
        <span className="card-banner__arrow" aria-hidden>→</span>
      </a>

      <footer className="qr-footer">
        <div className="footer-logo">{BRAND.name}</div>
      </footer>
    </main>
  );
}
