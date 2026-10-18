import "server-only";
import { prisma } from "@/lib/prisma";
import { NO_DB } from "@/lib/db";
import { siteConfig, type SiteConfig } from "@/config/site";

// ============================================================
//  محتوای سایت — مدیریت از پنل (/admin/content).
//  همه‌چیز در جدول Setting با پیشوند site. ذخیره می‌شود؛
//  هر کلیدِ ذخیره‌نشده از siteConfig (پیش‌فرض کد) می‌آید.
//  تغییر از پنل با revalidateShop بلافاصله روی سایت می‌نشیند.
// ============================================================

function lines(v: string | undefined): string[] {
  return (v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLinks(v: string | undefined, fallback: { label: string; href: string }[]) {
  const out = lines(v)
    .map((l) => {
      const i = l.indexOf("|");
      if (i < 0) return null;
      return { label: l.slice(0, i).trim(), href: l.slice(i + 1).trim() };
    })
    .filter((x): x is { label: string; href: string } => !!x && !!x.label && !!x.href);
  return out.length ? out : fallback;
}

// ============================================================
//  محتوای صفحات درباره ما و خدمات — متن‌ها از پنل، آیکون‌ها ثابت.
//  قالب هر خط: «عنوان | توضیح». تعداد از پیش‌فرض بیشتر/کمتر شود،
/// با پیش‌فرض‌ها پر/برش می‌خورد تا چیدمان صفحه به‌هم نریزد.
// ============================================================

export type TextItem = { title: string; desc: string };

function parsePaired(v: string | undefined, fallback: TextItem[]): TextItem[] {
  const rows = lines(v)
    .map((l) => {
      const i = l.indexOf("|");
      if (i < 0) return null;
      const title = l.slice(0, i).trim();
      const desc = l.slice(i + 1).trim();
      return title && desc ? { title, desc } : null;
    })
    .filter((x): x is TextItem => !!x);
  if (!rows.length) return fallback;
  return fallback.map((fb, i) => rows[i] ?? fb);
}

const ABOUT_DEFAULTS = {
  intro:
    "فروشگاه حسنی با سال‌ها فعالیت تخصصی در حوزهٔ تأمین لوازم یدکی خودروهای ایرانی، افتخار دارد به‌عنوان یکی از معتبرترین تأمین‌کنندگان قطعات شناخته شود. ما با تکیه بر دانش فنی، اصالت کالا و پشتیبانی تخصصی، همراه مطمئن تعمیرکاران و صاحبان خودرو هستیم.",
  stats: [
    { value: "+۱۲", label: "سال تجربه" },
    { value: "+۱۵۰", label: "قلم کالای تخصصی" },
    { value: "+۲۰۰۰", label: "مشتری وفادار" },
    { value: "۲۴/۷", label: "پشتیبانی" },
  ],
  cards: [
    { title: "ماموریت ما", desc: "تأمین لوازم یدکی اصلی خودروهای ایرانی با بالاترین کیفیت و رقابتی‌ترین قیمت، همراه با مشاورهٔ فنی رایگان برای تعمیرکاران و مشتریان." },
    { title: "چشم‌انداز", desc: "تبدیل‌شدن به مرجع برتر تأمین لوازم یدکی خودرو در کشور و ارتقای استاندارد خدمات پس از فروش." },
    { title: "ارزش‌های ما", desc: "اصالت کالا، صداقت در قیمت، پشتیبانی فنی پس از فروش و احترام به مشتری؛ اصولی که هرگز از آن‌ها کوتاه نمی‌آییم." },
  ],
  why: [
    { title: "اصالت کالا تضمین‌شده", desc: "تمام قطعات اصلی و دارای ضمانت اصالت هستند." },
    { title: "قیمت رقابتی", desc: "خرید مستقیم و بدون واسطه؛ بهترین قیمت بازار." },
    { title: "ارسال سراسر کشور", desc: "تحویل سریع و مطمئن به تمام نقاط ایران." },
    { title: "پشتیبانی تخصصی", desc: "مشاورهٔ فنی رایگان قبل و بعد از خرید." },
  ],
};

const SERVICES_DEFAULTS = {
  fanni: [
    { title: "فروش و تأمین قطعات فنی", desc: "تأمین مستقیم لنت، فیلتر، تسمه، کمک‌فنر و قطعات موتوری با بهترین قیمت." },
    { title: "مشاورهٔ فنی", desc: "مشاورهٔ رایگان توسط کارشناسان مجرب برای انتخاب قطعهٔ مناسب خودروی شما." },
    { title: "تعمیر و تعویض", desc: "معرفی تعمیرکاران مجرب و راهنمایی تخصصی برای تعویض قطعات." },
    { title: "ارسال سراسر کشور", desc: "تحویل سریع و مطمئن به تمام نقاط ایران با بسته‌بندی استاندارد." },
  ],
  badaneh: [
    { title: "فروش قطعات بدنه", desc: "تأمین سپر، چراغ، آینه و جلوپنجره انواع خودروهای ایرانی." },
    { title: "مشاورهٔ خرید", desc: "راهنمایی دقیق برای انتخاب قطعهٔ بدنهٔ سازگار با مدل خودرو." },
    { title: "تأمین سفارشی", desc: "سفارش و تأمین قطعات کمیاب بدنه در کوتاه‌ترین زمان." },
    { title: "پشتیبانی پس از فروش", desc: "پشتیبانی فنی و ضمانت اصالت قطعات عرضه‌شده." },
  ],
  perks: [
    { title: "اصالت و کیفیت", desc: "تمام محصولات اصل و دارای گارانتی هستند." },
    { title: "تحویل سریع", desc: "ارسال به سراسر کشور در کوتاه‌ترین زمان." },
    { title: "پشتیبانی دائمی", desc: "پاسخ‌گویی و پشتیبانی فنی پس از خرید." },
  ],
};

export type AboutContent = typeof ABOUT_DEFAULTS;
export type ServicesContent = typeof SERVICES_DEFAULTS;

function parseStats(v: string | undefined, fallback: { value: string; label: string }[]) {
  const rows = lines(v)
    .map((l) => {
      const i = l.indexOf("|");
      if (i < 0) return null;
      const value = l.slice(0, i).trim();
      const label = l.slice(i + 1).trim();
      return value && label ? { value, label } : null;
    })
    .filter((x): x is { value: string; label: string } => !!x);
  if (!rows.length) return fallback;
  return fallback.map((fb, i) => rows[i] ?? fb);
}

/** محتوای صفحات درباره ما و خدمات (با پیش‌فرض‌های فعلی) */
export async function getPageContent(): Promise<{ about: AboutContent; services: ServicesContent }> {
  if (NO_DB) return { about: ABOUT_DEFAULTS, services: SERVICES_DEFAULTS };
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: "site." } } });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const g = (k: string, fb: string) => {
    const v = m.get(k)?.trim();
    return v ? v : fb;
  };
  return {
    about: {
      intro: g("site.about.intro", ABOUT_DEFAULTS.intro),
      stats: parseStats(m.get("site.about.stats"), ABOUT_DEFAULTS.stats),
      cards: parsePaired(m.get("site.about.cards"), ABOUT_DEFAULTS.cards),
      why: parsePaired(m.get("site.about.why"), ABOUT_DEFAULTS.why),
    },
    services: {
      fanni: parsePaired(m.get("site.services.fanni"), SERVICES_DEFAULTS.fanni),
      badaneh: parsePaired(m.get("site.services.badaneh"), SERVICES_DEFAULTS.badaneh),
      perks: parsePaired(m.get("site.services.perks"), SERVICES_DEFAULTS.perks),
    },
  };
}

/** قالب نمایشی «عنوان | توضیح» برای فرم پنل */
export function toPairedLines(items: TextItem[]): string {
  return items.map((i) => `${i.title} | ${i.desc}`).join("\n");
}

/** پیکربندی نهایی سایت: پیش‌فرض‌های کد + رونویسی پنل */
export async function getSiteConfig(): Promise<SiteConfig> {
  if (NO_DB) return siteConfig;
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: "site." } } });
  if (!rows.length) return siteConfig;
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const g = (k: string, fb: string) => {
    const v = m.get(k)?.trim();
    return v ? v : fb;
  };

  let sales = siteConfig.contact.sales;
  try {
    const raw = m.get("site.contact.sales")?.trim();
    if (raw) {
      const arr = JSON.parse(raw) as { name: string; phone: string }[];
      if (Array.isArray(arr) && arr.length) sales = arr;
    }
  } catch {}

  const social = [...siteConfig.social];
  const ig = m.get("site.social.instagram")?.trim();
  const wa = m.get("site.social.whatsapp")?.trim();
  const tg = m.get("site.social.telegram")?.trim();
  for (const s of social) {
    if (s.icon === "Instagram" && ig) s.href = ig;
    if (s.icon === "MessageCircle" && wa) s.href = wa;
    if (s.icon === "Send" && tg) s.href = tg;
  }

  return {
    ...siteConfig,
    brand: {
      ...siteConfig.brand,
      name: g("site.brand.name", siteConfig.brand.name),
      tagline: g("site.brand.tagline", siteConfig.brand.tagline),
    },
    contact: {
      phone: g("site.contact.phone", siteConfig.contact.phone),
      sales,
      address: g("site.contact.address", siteConfig.contact.address),
      mapUrl: g("site.contact.mapUrl", siteConfig.contact.mapUrl ?? ""),
    },
    hero: {
      eyebrow: g("site.hero.eyebrow", siteConfig.hero.eyebrow),
      title: g("site.hero.title", siteConfig.hero.title),
      highlight: g("site.hero.highlight", siteConfig.hero.highlight),
      subtitle: g("site.hero.subtitle", siteConfig.hero.subtitle),
      ctaPrimary: {
        label: g("site.hero.cta1label", siteConfig.hero.ctaPrimary.label),
        href: g("site.hero.cta1href", siteConfig.hero.ctaPrimary.href),
      },
      ctaSecondary: {
        label: g("site.hero.cta2label", siteConfig.hero.ctaSecondary.label),
        href: g("site.hero.cta2href", siteConfig.hero.ctaSecondary.href),
      },
    },
    social,
    footer: {
      certifications: parseLinks(m.get("site.footer.certs"), siteConfig.footer.certifications),
      links: parseLinks(m.get("site.footer.links"), siteConfig.footer.links),
      catalogUrl: siteConfig.footer.catalogUrl,
      trust: (() => {
        const titles = lines(m.get("site.footer.trust"));
        if (!titles.length) return siteConfig.footer.trust;
        return siteConfig.footer.trust.map((fb, i) => ({ title: titles[i] ?? fb.title, desc: "" }));
      })(),
    },
  };
}
