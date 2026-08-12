export type WorkspaceTone = "green" | "blue" | "violet" | "orange" | "neutral";

export type Workspace = {
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  symbol: string;
  tone: WorkspaceTone;
};

export const workspaces: readonly Workspace[] = [
  {
    slug: "",
    label: "مرکز فرماندهی",
    shortLabel: "فرماندهی",
    description: "نمای مدیریتی قابل اعتماد از وضعیت محصول و کسب‌وکار",
    symbol: "⌂",
    tone: "green",
  },
  {
    slug: "users",
    label: "کاربران",
    shortLabel: "کاربران",
    description: "جست‌وجوی امن، User 360 و وضعیت حساب‌ها",
    symbol: "◎",
    tone: "green",
  },
  {
    slug: "analytics",
    label: "تحلیل محصول",
    shortLabel: "تحلیل",
    description: "KPIهای تعریف‌شده، رویدادها و روندهای محصول",
    symbol: "◇",
    tone: "blue",
  },
  {
    slug: "relationships",
    label: "روابط و رضایت",
    shortLabel: "روابط",
    description: "روابط، مجوزها، رضایت و دسترسی‌های بین‌فردی",
    symbol: "♡",
    tone: "green",
  },
  {
    slug: "support",
    label: "پشتیبانی",
    shortLabel: "پشتیبانی",
    description: "تیکت‌ها، اولویت، SLA و تاریخچه تعامل با کاربر",
    symbol: "◉",
    tone: "orange",
  },
  {
    slug: "commerce",
    label: "فروش و تجارت",
    shortLabel: "تجارت",
    description: "پلن‌ها، اشتراک‌ها، entitlement و ترفیع‌ها",
    symbol: "▣",
    tone: "blue",
  },
  {
    slug: "marketing",
    label: "بازاریابی",
    shortLabel: "بازاریابی",
    description: "کمپین‌ها، attribution، محتوا و شبکه‌های اجتماعی",
    symbol: "◈",
    tone: "violet",
  },
  {
    slug: "finance",
    label: "مالی",
    shortLabel: "مالی",
    description: "درآمد، هزینه، بودجه، burn rate و runway",
    symbol: "$",
    tone: "violet",
  },
  {
    slug: "operations",
    label: "عملیات",
    shortLabel: "عملیات",
    description: "سلامت سرویس‌ها، jobها، خطاها، انتشار و رخدادها",
    symbol: "⚙",
    tone: "neutral",
  },
  {
    slug: "security",
    label: "امنیت",
    shortLabel: "امنیت",
    description: "Audit، نقش‌ها، مجوزها و دسترسی‌های حساس",
    symbol: "▱",
    tone: "orange",
  },
  {
    slug: "ai",
    label: "مشاور هوش مصنوعی",
    shortLabel: "AI",
    description: "تحلیل read-only با ابزارهای کنترل‌شده کسب‌وکار",
    symbol: "✦",
    tone: "violet",
  },
  {
    slug: "settings",
    label: "تنظیمات",
    shortLabel: "تنظیمات",
    description: "پیکربندی محیط، تیم و تنظیمات Command Center",
    symbol: "≡",
    tone: "neutral",
  },
] as const;

export function workspaceHref(workspace: Workspace): string {
  return workspace.slug ? `/${workspace.slug}` : "/";
}

export function findWorkspace(slug: string): Workspace | undefined {
  return workspaces.find((workspace) => workspace.slug === slug);
}
