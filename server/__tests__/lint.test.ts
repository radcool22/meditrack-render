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

  // ── scorecard grounding ───────────────────────────────────────────────────

  it("passes scorecard displayValue grounded in findings", () => {
    const script = makeScript("doctor se milein", {
      kind: "scorecard",
      title: "Lipid Profile",
      items: [{ label: "LDL", status: "high", displayValue: "142 mg/dL" }],
    });
    expect(() => lintScript(script, [baseFinding()])).not.toThrow();
  });

  it("fails scorecard displayValue with ungrounded number", () => {
    const script = makeScript("doctor se milein", {
      kind: "scorecard",
      title: "Lipid Profile",
      items: [{ label: "LDL", status: "high", displayValue: "999 mg/dL" }],
    });
    expect(() => lintScript(script, [baseFinding()])).toThrow(
      "does not match any finding",
    );
  });

  // ── combinedSparkline grounding ───────────────────────────────────────────

  it("passes combinedSparkline with grounded value and history", () => {
    const script = makeScript("doctor se milein", {
      kind: "combinedSparkline",
      label: "LDL",
      value: "142",
      unit: "mg/dL",
      status: "high",
      history: [
        { x: "May", y: 118 },
        { x: "Oct", y: 142 },
      ],
    });
    expect(() =>
      lintScript(script, [
        baseFinding({ history: [{ date: "2025-05", value: 118 }] }),
      ]),
    ).not.toThrow();
  });

  it("fails combinedSparkline with ungrounded value", () => {
    const script = makeScript("doctor se milein", {
      kind: "combinedSparkline",
      label: "LDL",
      value: "153",
      unit: "mg/dL",
      status: "high",
      history: [
        { x: "May", y: 118 },
        { x: "Oct", y: 142 },
      ],
    });
    expect(() =>
      lintScript(script, [
        baseFinding({ history: [{ date: "2025-05", value: 118 }] }),
      ]),
    ).toThrow("does not match any finding");
  });

  it("passes combinedSparkline history matching findings", () => {
    const script = makeScript("doctor se milein", {
      kind: "combinedSparkline",
      label: "LDL",
      value: "142",
      unit: "mg/dL",
      status: "high",
      history: [
        { x: "May", y: 118 },
        { x: "Jun", y: 124 },
        { x: "Oct", y: 142 },
      ],
    });
    expect(() =>
      lintScript(script, [
        baseFinding({
          history: [
            { date: "2025-05", value: 118 },
            { date: "2025-06", value: 124 },
          ],
        }),
      ]),
    ).not.toThrow();
  });

  it("fails combinedSparkline history with ungrounded point", () => {
    const script = makeScript("doctor se milein", {
      kind: "combinedSparkline",
      label: "LDL",
      value: "142",
      unit: "mg/dL",
      status: "high",
      history: [
        { x: "May", y: 118 },
        { x: "Oct", y: 999 },
      ],
    });
    expect(() =>
      lintScript(script, [
        baseFinding({ history: [{ date: "2025-05", value: 118 }] }),
      ]),
    ).toThrow("does not match any finding");
  });

  // ── existing chart spec test ──────────────────────────────────────────────

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

  // ── digits inside test names, units, dates, Indian grouping ──────────────

  const hba1c = baseFinding({ valueName: "HbA1c", value: 6.1, unit: "%", referenceRange: { low: null, high: 5.7 } });

  it("ignores digits that are part of a test name (HbA1c, B12, T3, omega-3)", () => {
    for (const caption of [
      "आपका HbA1c 6.1 है — doctor से मिलें",
      "Vitamin B12 और T3 normal हैं — doctor से मिलें",
      "omega-3 बढ़ाएं — doctor से मिलें",
    ]) {
      expect(() => lintScript(makeScript(caption), [hba1c])).not.toThrow();
    }
  });

  it("still catches an invented value right after a test name", () => {
    expect(() => lintScript(makeScript("आपका HbA1c 9.9 है — doctor से मिलें"), [hba1c])).toThrow(
      "does not match any finding",
    );
  });

  it("catches invented values written in Devanagari digits", () => {
    expect(() => lintScript(makeScript("आपका HbA1c ९.९ है — doctor से मिलें"), [hba1c])).toThrow(
      "does not match any finding",
    );
  });

  it("passes '20-30 min' (prompt's own lifestyle advice)", () => {
    expect(() => lintScript(makeScript("रोज़ 20-30 min walk करें — doctor से मिलें"), [baseFinding()])).not.toThrow();
  });

  it("grounds the report date when it is spoken", () => {
    const script = makeScript("यह आपकी 18 October 2025 की report है — doctor से मिलें");
    expect(() => lintScript(script, [baseFinding()], { date: "2025-10-18" })).not.toThrow();
    expect(() => lintScript(makeScript("यह 3 March 2019 की report है — doctor से मिलें"), [baseFinding()], { date: "2025-10-18" })).toThrow(
      "does not match any finding",
    );
  });

  it("reads Indian grouping as one number and ignores digits inside units", () => {
    const platelets = baseFinding({ valueName: "Platelets", value: 150000, unit: "/cumm", referenceRange: { low: 150000, high: 410000 }, status: "normal" });
    const wbc = baseFinding({ valueName: "WBC", value: 6.5, unit: "10^3/µL", referenceRange: { low: 4, high: 11 }, status: "normal" });
    expect(() => lintScript(makeScript("Platelets 1,50,000 हैं, WBC 6.5 10^3/µL है"), [platelets, wbc])).not.toThrow();
  });
});

describe("safety phrasing", () => {
  it("accepts a doctor recommendation written in Devanagari", () => {
    expect(() => lintScript(makeScript("एक महीने के अंदर डॉक्टर से मिल लीजिए"), [baseFinding()])).not.toThrow();
  });

  it("does not treat advice or reassurance as a diagnosis", () => {
    for (const caption of ["आपको रोज़ walk करना ज़रूरी है — doctor से मिलें", "आपको कोई problem नहीं है — doctor से मिलें"]) {
      expect(() => lintScript(makeScript(caption), [baseFinding()])).not.toThrow();
    }
  });

  it("rejects diagnostic phrasing", () => {
    for (const caption of ["आपको cholesterol की problem है", "आपको diabetes है", "Aapko sugar ki bimari hai"]) {
      expect(() => lintScript(makeScript(`${caption} — doctor से मिलें`), [baseFinding()])).toThrow("diagnostic");
    }
  });

  it("rejects medication names", () => {
    expect(() => lintScript(makeScript("Metformin लीजिए — doctor से मिलें"), [baseFinding()])).toThrow("medication");
  });
});
