import { describe, expect, it } from "vitest";
import { parseWebsiteContent } from "@/lib/websiteContent";

describe("parseWebsiteContent", () => {
  it("normalizes valid site content", () => {
    const content = parseWebsiteContent({
      theme: "indigo",
      sections: [{
        id: "services",
        type: "services",
        title: "Servicios",
        items: [{ title: "Filmación", desc: "Producción en locación" }],
      }],
    });

    expect(content.theme).toBe("indigo");
    expect(content.sections[0]).toMatchObject({
      id: "services",
      items: [{ title: "Filmación", desc: "Producción en locación" }],
    });
  });

  it("drops malformed sections and nested entries safely", () => {
    const content = parseWebsiteContent({
      sections: [
        null,
        { id: 9, type: "hero" },
        { id: "pricing", type: "pricing", plans: [{ name: "Pro", price: 99 }] },
      ],
    });

    expect(content.theme).toBe("emerald");
    expect(content.sections).toEqual([{ id: "pricing", type: "pricing", plans: [] }]);
  });

  it("returns a safe empty document for non-object input", () => {
    expect(parseWebsiteContent("broken")).toEqual({ theme: "emerald", sections: [] });
  });
});
