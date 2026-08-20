import { generateMockRecoveryKey } from "@/src/debug/ui-lab/secure-backups/fixtures";

describe("generateMockRecoveryKey", () => {
  it("returns four dash-separated four-character groups", () => {
    const key = generateMockRecoveryKey();
    expect(key).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
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
