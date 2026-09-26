/**
 * Клиентский трекер веб-аналитики для меню Luma Garden
 * Отправляет события посещений и просмотров/кликов блюд в бэкенд Lokmaco v2
 */

export interface TrackItemOptions {
  id?: string;
  name: string;
  category?: string;
  price?: number;
}

const API_TRACK_URL = 'https://lokmaco-web-v2.vercel.app/api/analytics/menu/track';
const SITE_ID = 'luma_garden';

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let vid = localStorage.getItem('__lkm_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('__lkm_vid', vid);
    }
    return vid;
  } catch {
    return 'v_anon_' + Date.now();
  }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem('__lkm_sid');
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('__lkm_sid', sid);
    }
    return sid;
  } catch {
    return 's_anon_' + Date.now();
  }
}

export function sendAnalyticsEvent(eventType: string, extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    siteId: SITE_ID,
    eventType,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    pagePath: window.location.pathname + window.location.search,
    referrer: document.referrer || '',
    ...extra,
  };

  const json = JSON.stringify(payload);

  // 1. Приоритетный путь: fetch с keepalive и text/plain
  // text/plain не требует предварительного CORS OPTIONS preflight запроса,
  // поэтому мгновенно проходит в iOS Safari, Chrome Mobile и не блокируется WebKit
  if (typeof fetch === 'function') {
    try {
      fetch(API_TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: json,
        mode: 'cors',
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {
        trySendBeacon(json);
      });
      return;
    } catch {
      // Игнорируем и пробуем sendBeacon
    }
  }

  trySendBeacon(json);
}

function trySendBeacon(json: string) {
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([json], { type: 'text/plain' });
      navigator.sendBeacon(API_TRACK_URL, blob);
    } catch {
      // noop
    }
  }
}

export function trackPageView(path?: string) {
  sendAnalyticsEvent('pageview', path ? { pagePath: path } : {});
}

export function trackItemClick(item: TrackItemOptions) {
  sendAnalyticsEvent('item_click', {
    itemId: item.id,
    itemName: item.name,
    itemCategory: item.category,
    itemPrice: item.price,
  });
}
