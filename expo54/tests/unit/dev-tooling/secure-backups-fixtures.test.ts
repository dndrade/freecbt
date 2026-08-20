import { generateMockRecoveryKey } from "@/src/debug/ui-lab/secure-backups/fixtures";

describe("generateMockRecoveryKey", () => {
  it("returns eight dash-separated eight-character groups, 64 key characters total", () => {
    const key = generateMockRecoveryKey();
    expect(key).toMatch(/^[A-Z0-9]{8}(-[A-Z0-9]{8}){7}$/);
    expect(key.replace(/-/g, "")).toHaveLength(64);
  });

  it("excludes visually ambiguous characters", () => {
    const key = generateMockRecoveryKey();
    expect(key).not.toMatch(/[01OIL]/);
  });

  it("generates different keys across calls", () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateMockRecoveryKey()));
    expect(keys.size).toBeGreaterThan(1);
  });
});
