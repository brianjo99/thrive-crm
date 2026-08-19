import { describe, expect, it } from "vitest";
import { parsePortalSnapshot } from "@/lib/clientPortal";

const id = "11111111-1111-4111-8111-111111111111";

function emptySnapshot() {
  return {
    client: null,
    campaigns: [],
    approvals: [],
    deliverables: [],
    calendar: [],
    invoices: [],
    alerts: [],
  };
}

describe("parsePortalSnapshot", () => {
  it("accepts the secure empty portal payload", () => {
    expect(parsePortalSnapshot(emptySnapshot())).toEqual(emptySnapshot());
  });

  it("accepts a complete client campaign payload", () => {
    const payload = {
      ...emptySnapshot(),
      client: { id, name: "Acme", avatar_url: null, email: "hola@acme.test" },
      campaigns: [{
        id,
        name: "Lanzamiento",
        current_stage: "editing",
        stages: ["discovery", "filming", "editing", "complete"],
        due_date: "2026-09-30",
      }],
    };

    expect(parsePortalSnapshot(payload).campaigns[0].current_stage).toBe("editing");
  });

  it("rejects malformed or over-trusted server data", () => {
    expect(() => parsePortalSnapshot({ ...emptySnapshot(), campaigns: [{ id: "not-a-uuid" }] })).toThrow();
  });
});
