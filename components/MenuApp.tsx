"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Lang, MenuData, MenuItem, SectionKey } from "@/lib/types";
import { BADGES, LANGS, UI, formatPrice, unitLabel } from "@/lib/i18n";
import { brandView } from "@/lib/brand";

function DishBadges({ badges, lang }: { badges?: string[]; lang: Lang }) {
  if (!badges?.length) return null;
  return (
    <div className="dish-badges">
      {badges.map((b) => (
        <span key={b} className={`badge badge--${b}`}>{BADGES[b]?.[lang] ?? b}</span>
      ))}
    </div>
  );
}

export default function MenuApp({ menu }: { menu: MenuData }) {
  const view = brandView(menu);
  const [lang, setLang] = useState<Lang>("ru");
  const [section, setSection] = useState<SectionKey>("food");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCat, setActiveCat] = useState<string>("all");
  const quickFilter = "all";
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const t = UI[lang];
  const cur = menu.brand.currency[lang];

  useEffect(() => {
    const saved = localStorage.getItem("lumagarden-lang");
    if (saved && LANGS.includes(saved as Lang)) setLang(saved as Lang);
    
    // Auto-open item if passed in URL
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("item");
    if (itemId) {
      for (const sectionKey of ["food", "drinks"] as const) {
        for (const cat of menu.sections[sectionKey]) {
          const found = cat.items.find(i => i.id === itemId);
          if (found) {
            setSelected(found);
            setSection(sectionKey);
            break;
          }
        }
      }
    }

  }, [menu]);

  // Настоящая предзагрузка: показываем меню, только когда фото готовы
  useEffect(() => {
    const urls: string[] = [];
    for (const sec of ["food", "drinks"] as const)
      for (const cat of menu.sections[sec])
        for (const item of cat.items)
          if (item.available && item.imageUrl) urls.push(item.imageUrl);

    if (urls.length === 0) {
      setLoading(false);
      return;
    }

    let done = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setProgress(1);
      setTimeout(() => setLoading(false), 250);
    };
    const bump = () => {
      done += 1;
      setProgress(done / urls.length);
      if (done >= urls.length) finish();
    };
    urls.forEach((u) => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = u;
    });
    // страховка от зависания на медленной сети
    const fallback = setTimeout(finish, 7000);
    return () => clearTimeout(fallback);
  }, [menu]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selected) {
      if (!dialog?.open) dialog?.showModal();
      const newUrl = `${window.location.pathname}?item=${selected.id}`;
      window.history.replaceState({ itemId: selected.id }, "", newUrl);
    } else {
      if (dialog?.open) dialog.close();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [selected]);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sectionKeys = useMemo(
    () => (["food", "drinks"] as SectionKey[]).filter((s) => menu.sections[s].length > 0),
    [menu]
  );
  const categories = menu.sections[section];
  const availableItems = useMemo(
    () => categories.flatMap((c) => c.items.filter((i) => i.available)),
    [categories]
  );
  const featuredItems = useMemo(() => {
    const picked = availableItems.filter((i) => i.badges?.some((b) => b === "hit" || b === "new"));
    return (picked.length ? picked : availableItems).slice(0, 4);
  }, [availableItems]);
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return categories
      .filter((c) => activeCat === "all" || c.id === activeCat)
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            i.available &&
            (quickFilter === "all" || i.badges?.includes(quickFilter)) &&
            (!q ||
              i.name[lang].toLowerCase().includes(q) ||
              i.description[lang].toLowerCase().includes(q))
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, activeCat, deferredQuery, lang, quickFilter]);

  const switchLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lumagarden-lang", l);
  };

  const switchSection = (s: SectionKey) => {
    setSection(s);
    setActiveCat("all");
    setQuery("");
  };

  const shareItem = (item: MenuItem) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?item=${item.id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  const closeDialog = () => {
    setClosing(true);
    setTimeout(() => {
      setSelected(null);
      setClosing(false);
    }, 200);
  };

  return (
    <>
      <div className={`welcome-loader ${loading ? "" : "hidden"}`} role="status">
        <div className="welcome-card">
          <span className="welcome-kicker">{t.qr_menu}</span>
          <div className="welcome-logo">{view.welcomeTitle}</div>
          <div className="welcome-line">{view.welcomeLine}</div>
          <div className="welcome-progress welcome-progress--real">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>

      <main className="qr-shell">
        <header className="qr-header">
          <div className="brand-lockup">
            <span className="brand-lockup__eyebrow">{t.qr_menu}</span>
            <h1>{view.name}</h1>
          </div>
          <div className="lang-switcher" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className={`lang-switcher__btn ${l === lang ? "active" : ""}`}
                onClick={() => switchLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <section className="menu-controls">
          {sectionKeys.length > 1 && (
          <div className="section-tabs" role="tablist">
            {sectionKeys.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={section === s}
                className={`section-tab ${section === s ? "active" : ""}`}
                onClick={() => switchSection(s)}
              >
                {t[s]}
              </button>
            ))}
          </div>
          )}

          <div className="search-field">
            <span className="search-field__icon" aria-hidden>⌕</span>
            <input
              type="text"
              placeholder={t.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="search-field__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="category-chips">
            <button
              type="button"
              className={`chip ${activeCat === "all" ? "active" : ""}`}
              onClick={() => setActiveCat("all")}
            >
              {t.all}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${activeCat === c.id ? "active" : ""}`}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name[lang]}
              </button>
            ))}
          </div>
        </section>

        {featuredItems.length > 0 && !deferredQuery.trim() && activeCat === "all" && (
          <section className="chef-strip" aria-labelledby="chef-strip-title">
            <div className="chef-strip__head">
              <span>{t.chef_kicker}</span>
              <h2 id="chef-strip-title">{t.chef_title}</h2>
            </div>
            <div className="chef-picks">
              {featuredItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="chef-pick"
                  onClick={() => setSelected(item)}
                >
                  <span className="chef-pick__num">{String(index + 1).padStart(2, "0")}</span>
                  <span className="chef-pick__name">{item.name[lang]}</span>
                  <span className="chef-pick__price">{formatPrice(item.price)} {cur}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="guest-menu" key={`${section}-${activeCat}-${quickFilter}-${deferredQuery}`}>
          {filtered.length === 0 && <div className="no-results">{t.no_results}</div>}
          {filtered.map((c) => (
            <div key={c.id} className="category-block">
              <div className="category-title">
                <h2>{c.name[lang]}</h2>
                <span>{c.items.length} {t.items}</span>
              </div>
              <div className="dish-grid">
                {c.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`dish-card ${item.imageUrl ? "" : "dish-card--text"}`}
                    onClick={() => setSelected(item)}
                  >
                    <DishBadges badges={item.badges} lang={lang} />
                    {item.imageUrl ? (
                      <img className="dish-card__img" src={item.imageUrl} alt={item.name[lang]} loading="lazy" style={{ objectPosition: item.imagePosition, transformOrigin: item.imagePosition, transform: item.imageZoom && item.imageZoom !== 1 ? `scale(${item.imageZoom})` : undefined }} />
                    ) : null}
                    <div className="dish-card__body">
                      <div className="dish-card__name">{item.name[lang]}</div>
                      <div className="dish-card__desc">{item.description[lang]}</div>
                      <div className="dish-card__meta">
                        <span className="dish-card__price">
                          {formatPrice(item.price)}<small>{cur}</small>
                        </span>
                        {item.weight ? (
                          <span className="dish-card__weight">{item.weight} {unitLabel(item.measureUnit, lang)}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <a className="card-banner" href="/card">
          <span className="card-banner__star" aria-hidden>✦</span>
          <span className="card-banner__text">{t.card_link}</span>
          <span className="card-banner__arrow" aria-hidden>→</span>
        </a>

        <footer className="qr-footer">
          <div className="footer-logo">{view.name}</div>
          {view.info && (
            <div className="info-block">
              {view.info.address && <div className="info-row">📍 {view.info.address}</div>}
              {view.info.hours && (
                <div className="info-row">🕙 {t.hours_label}: {view.info.hours}</div>
              )}
              {view.info.service && (
                <div className="info-row">{t.service_label}: {view.info.service}</div>
              )}
              {view.info.phone && (
                <div className="info-row">
                  ☎ <a href={`tel:${view.info.phone.replace(/[^+\d]/g, "")}`}>{view.info.phone}</a>
                </div>
              )}
              {view.info.instagram && (
                <div className="info-row">
                  <a href={`https://instagram.com/${view.info.instagram}`} target="_blank" rel="noopener">
                    @{view.info.instagram}
                  </a>
                </div>
              )}
              {view.info.wifi && <div className="info-row">Wi-Fi: {view.info.wifi}</div>}
            </div>
          )}
        </footer>

        {showScrollTop && (
          <button
            type="button"
            className="scroll-top-btn"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            ↑
          </button>
        )}
      </main>

      <dialog
        ref={dialogRef}
        className={`dish-dialog ${closing ? "closing" : ""}`}
       
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
      >
        {selected && (
          <div style={{ position: "relative" }}>
            <button type="button" className="dialog-close" onClick={closeDialog} aria-label="Close">×</button>
            <div
              onClick={closeDialog}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "36px",
                zIndex: 15,
                cursor: "pointer"
              }}
              aria-hidden="true"
            />
            <DishBadges badges={selected.badges} lang={lang} />
            {selected.imageUrl ? (
              <div className="dialog-img-wrapper" style={{ position: "relative" }}>
                <img className="dialog-img" src={selected.imageUrl} alt={selected.name[lang]} style={{ objectPosition: selected.imagePosition, transformOrigin: selected.imagePosition, transform: selected.imageZoom && selected.imageZoom !== 1 ? `scale(${selected.imageZoom})` : undefined }} />
              </div>
            ) : null}
            <div className={`dialog-body ${selected.imageUrl ? "" : "dialog-body--text"}`}>
              <h3>{selected.name[lang]}</h3>
              <p className="dialog-desc">{selected.description[lang]}</p>
              <div className="dialog-meta">
                <div className="dialog-meta__left">
                  <span className="dialog-price">
                    {formatPrice(selected.price)}<small>{cur}</small>
                  </span>
                  {selected.weight ? (
                    <span className="dialog-weight">{selected.weight} {unitLabel(selected.measureUnit, lang)}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`dialog-share-btn ${copied ? "copied" : ""}`}
                  onClick={() => shareItem(selected)}
                  aria-label="Share dish"
                >
                  {copied ? (lang === "ru" ? "Ссылка скопирована!" : lang === "uz" ? "Havola nusxalandi!" : "Copied!") : (lang === "ru" ? "Поделиться" : lang === "uz" ? "Ulashish" : "Share")}
                </button>
              </div>
              {selected.nutrition?.kcal ? (
                <div className="nutrition-block">
                  <h4>{t.nutrition}</h4>
                  <div className="nutrition-grid">
                    <div><b>{selected.nutrition.kcal}</b><span>{t.kcal}</span></div>
                    <div><b>{selected.nutrition.proteins ?? "—"}</b><span>{t.proteins}</span></div>
                    <div><b>{selected.nutrition.fats ?? "—"}</b><span>{t.fats}</span></div>
                    <div><b>{selected.nutrition.carbs ?? "—"}</b><span>{t.carbs}</span></div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
