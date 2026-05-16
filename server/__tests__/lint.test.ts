import { describe, it, expect, vi } from "vitest";

// Mock the banned-meds file read
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: (p: string, ...args: unknown[]) => {
      if (typeof p === "string" && p.includes("banned-meds"))
        return "aspirin\nmetformin\n";
      return (actual.readFileSync as Function)(p, ...args);
    },
  };
});

import { lintScript } from "../pipeline/lint";
import type { Finding } from "../types";

const baseFinding = (overrides: Partial<Finding> = {}): Finding => ({
  valueName: "LDL Cholesterol",
  value: 142,
  unit: "mg/dL",
  referenceRange: { low: 0, high: 100 },
  status: "high",
  history: null,
  ...overrides,
});

const makeScript = (caption: string, chart: any = null) => ({
  patientFirstName: "Priya",
  reportType: "Lipid Profile",
  reportDate: "18 Oct 2025",
  lang: "hi" as const,
  hasCriticalValue: false,
  beats: [{ startFrame: 0, endFrame: 90, caption, chart }],
});

describe("number grounding", () => {
  it("passes when caption number matches a finding", () => {
    const script = makeScript("Aapka LDL 142 hai — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("fails when caption number does not match any finding", () => {
    const script = makeScript("Aapka LDL 153 hai — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).toThrow(
      "does not match any finding",
    );
  });

  it("passes for contextual time: '6 mahine'", () => {
    const script = makeScript("pichhle 6 mahine mein — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes for contextual time: '3 hafte'", () => {
    const script = makeScript("3 hafte mein doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes when caption has both contextual and grounded numbers", () => {
    const script = makeScript(
      "Aapka LDL 6 mahine mein 142 ho gaya — doctor se milein",
    );
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes for Devanagari time: '6 महीनों'", () => {
    const script = makeScript("पिछले 6 महीनों में — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes for Devanagari time: '3 महीने'", () => {
    const script = makeScript("3 महीने बाद — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes for range: '4-6 हफ़्ते'", () => {
    const script = makeScript("अगले 4-6 हफ़्ते — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes for Latin time near Devanagari: '20 minute'", () => {
    const script = makeScript("रोज़ 20 minute walk करें — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes for Devanagari digit: '६ महीने'", () => {
    const script = makeScript("६ महीने बाद — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("passes mixed: grounded 142 + contextual 6 महीनों", () => {
    const script = makeScript("LDL 142 mg/dL है, 6 महीनों में — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("still fails for ungrounded medical value alongside Devanagari time", () => {
    const script = makeScript("LDL 153 mg/dL — doctor se milein");
    expect(() => lintScript(script, [baseFinding()])).toThrow(
      "does not match any finding",
    );
  });

  it("fails for ungrounded number in chart spec even if it looks contextual", () => {
    const script = makeScript("doctor se milein", {
      kind: "bigNumber",
      label: "LDL",
      value: "153",
    });
    expect(() => lintScript(script, [baseFinding()])).toThrow(
      "does not match any finding",
    );
  });
});
