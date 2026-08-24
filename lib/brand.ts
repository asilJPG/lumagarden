import type { MenuData } from "./types";

// Отдельный деплой = один бренд. Конфиг вынесен, чтобы витринные строки и палитра
// лежали в одном месте, а не расползались по компонентам.
export interface BrandInfo {
  wifi?: string;
  phone?: string;
  instagram?: string;
  address?: string;
  hours?: string;
  service?: string;
}

export interface Brand {
  key: "luma";
  name: string;
  logoText: string;
  tagline: string;
  welcomeTitle: string;
  welcomeLine: string;
  /** Контакты ресторана. Пока пусто — блок в футере просто не отрисуется. */
  info: BrandInfo;
  /** Палитра с напечатанного меню. Дублируется в globals.css, менять синхронно. */
  palette: {
    bg: string;
    surface: string;
    deep: string;
    olive: string;
    ochre: string;
    gold: string;
    text: string;
  };
  /** Программа лояльности общая с The Lokmaco: одна организация iiko,
   *  один класс Google Wallet, один баланс. Название — общее для обоих. */
  program: {
    name: string;
    venues: string;
  };
  metadata: {
    menuTitle: string;
    menuDescription: string;
    cardTitle: string;
    cardDescription: string;
    appName: string;
    shortName: string;
  };
}

export const BRAND: Brand = {
  key: "luma",
  name: "Luma Garden",
  logoText: "Luma Garden",
  tagline: "Restaurant & Catering",
  welcomeTitle: "Luma Garden",
  welcomeLine: "Xush kelibsiz • Добро пожаловать • Welcome",
  info: { service: "13%" },
  palette: {
    bg: "#F4F0E4",
    surface: "#E2E4D2",
    deep: "#4A5A44",
    olive: "#5C7048",
    ochre: "#8A5A3B",
    gold: "#9A7B3E",
    text: "#2C2C24",
  },
  program: {
    name: "The Lokmaco · Luma Garden",
    venues: "Карта действует в The Lokmaco и Luma Garden",
  },
  metadata: {
    menuTitle: "Luma Garden · Меню",
    menuDescription: "Меню ресторана Luma Garden.",
    cardTitle: "Luma Garden · Бонусная карта",
    cardDescription: "Бонусная карта Luma Garden — копите бонусы с каждой покупкой.",
    appName: "Luma Garden",
    shortName: "Luma",
  },
};

export interface BrandView {
  name: string;
  welcomeTitle: string;
  welcomeLine: string;
  info?: BrandInfo;
}

const hasAnyInfo = (info: BrandInfo): boolean =>
  Object.values(info).some((v) => typeof v === "string" && v.trim() !== "");

// menu.json общий с The Lokmaco: блюда и валюта берутся оттуда, витринные строки
// и контакты — из бренда, иначе в футере Luma Garden окажется адрес Lokmaco.
export function brandView(menu: MenuData): BrandView {
  void menu;
  return {
    name: BRAND.name,
    welcomeTitle: BRAND.welcomeTitle,
    welcomeLine: BRAND.welcomeLine,
    info: hasAnyInfo(BRAND.info) ? BRAND.info : undefined,
  };
}
