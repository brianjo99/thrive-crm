import { Tables } from "@/integrations/supabase/types";

export type WebsiteServiceItem = { title: string; desc: string };
export type WebsitePricingPlan = { name: string; price: string; features: string[] };
export type WebsiteTestimonial = { author: string; rating: number; text: string };

export type WebsiteSection = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  buttonLabel?: string;
  image?: string;
  text?: string;
  items?: WebsiteServiceItem[];
  plans?: WebsitePricingPlan[];
  reviews?: WebsiteTestimonial[];
};

export type WebsiteContent = {
  theme: string;
  sections: WebsiteSection[];
};

export type Website = Omit<
  Tables<"websites">,
  "content" | "published" | "views" | "leads_count"
> & {
  content: WebsiteContent;
  published: boolean;
  views: number;
  leads_count: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function parseSection(value: unknown): WebsiteSection | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.type !== "string") return null;

  const section: WebsiteSection = {
    id: value.id,
    type: value.type,
    title: optionalString(value, "title"),
    subtitle: optionalString(value, "subtitle"),
    ctaLabel: optionalString(value, "ctaLabel"),
    buttonLabel: optionalString(value, "buttonLabel"),
    image: optionalString(value, "image"),
    text: optionalString(value, "text"),
  };

  if (Array.isArray(value.items)) {
    section.items = value.items.flatMap((item) => {
      if (!isRecord(item) || typeof item.title !== "string" || typeof item.desc !== "string") return [];
      return [{ title: item.title, desc: item.desc }];
    });
  }

  if (Array.isArray(value.plans)) {
    section.plans = value.plans.flatMap((plan) => {
      if (!isRecord(plan) || typeof plan.name !== "string" || typeof plan.price !== "string") return [];
      const features = Array.isArray(plan.features)
        ? plan.features.filter((feature): feature is string => typeof feature === "string")
        : [];
      return [{ name: plan.name, price: plan.price, features }];
    });
  }

  if (Array.isArray(value.reviews)) {
    section.reviews = value.reviews.flatMap((review) => {
      if (!isRecord(review) || typeof review.author !== "string" || typeof review.text !== "string") return [];
      return [{
        author: review.author,
        text: review.text,
        rating: typeof review.rating === "number" && Number.isFinite(review.rating) ? review.rating : 5,
      }];
    });
  }

  return section;
}

export function parseWebsiteContent(value: unknown): WebsiteContent {
  if (!isRecord(value)) return { theme: "emerald", sections: [] };
  return {
    theme: typeof value.theme === "string" ? value.theme : "emerald",
    sections: Array.isArray(value.sections)
      ? value.sections.flatMap((section) => {
          const parsed = parseSection(section);
          return parsed ? [parsed] : [];
        })
      : [],
  };
}

export function normalizeWebsite(row: Tables<"websites">): Website {
  return {
    ...row,
    content: parseWebsiteContent(row.content),
    published: row.published ?? false,
    views: row.views ?? 0,
    leads_count: row.leads_count ?? 0,
  };
}
