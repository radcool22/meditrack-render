import { staticFile } from "remotion";
// Typed payload consumed by the MediTrack Remotion composition.
// Numbers come from the patient's actual report — the LLM never invents them.
// See CLAUDE.md §2.2.1.

export type ChartSpec =
  | {
      kind: "bigNumber";
      value: string;
      label: string;
      unit?: string;            // e.g. "mg/dL"
      delta?: string;
      trend?: "up" | "down" | "flat";   // direction of change over time
      // Medical severity — controls color in the renderer.
      // Coexists with trend: status is "how bad is it", trend is "which way is it going".
      status?: "normal" | "borderline" | "high" | "low" | "critical";
      rotation?: number;        // degrees, default 1
    }
  | {
      kind: "bar";
      data: {
        label: string;
        emoji: string;
        value: number;
        displayValue: string;
        status: "success" | "danger";
      }[];
      rotations?: number[];     // one per row, default [-1, 1, -1]
    }
  | {
      kind: "line";
      data: { x: string; y: number }[];
      highlight?: number;
      title: string;
      titleEmoji: string;
      rotation?: number;        // degrees, default -1
    }
  | {
      kind: "scorecard";
      title?: string;           // e.g. "Lipid Profile — 4 values"
      items: Array<{
        label: string;          // short name — "LDL", "HDL", etc.
        status: "normal" | "borderline" | "high" | "low" | "critical";
        displayValue?: string;  // e.g. "142 mg/dL"
      }>;
      rotation?: number;
    }
  | {
      kind: "combinedSparkline";
      label: string;            // "LDL CHOLESTEROL"
      value: string;            // "142"
      unit: string;             // "mg/dL"
      status: "normal" | "borderline" | "high" | "low" | "critical";
      history: Array<{ x: string; y: number }>;  // ≥ 2 points
      rotation?: number;
    };

export type Beat = {
  startFrame: number;
  endFrame: number;
  caption: string;
  chart?: ChartSpec | null;
  lookAt?: 'chart' | 'viewer';
};

export type MediTrackPayload = {
  // Identity
  patientFirstName: string;
  reportType: string;
  reportDate: string;
  lang: 'hi' | 'en';

  // Safety — never empty; the Disclaimer component renders this every frame
  disclaimer: string;
  hasCriticalValue: boolean;    // true → critical-value variant of beat 1

  // Assets (signed URLs in production; empty strings for sample renders)
  audioUrl: string;

  // Character identity
  avatarName: string;           // "डॉ. Asha"
  avatarRole: string;           // invariant: "MediTrack AI"

  // Narrative
  beats: Beat[];
};

// ─── Sample payload — Priya lipid profile, 8 beats, ~33s ────────────────────
export const sampleMediTrack: MediTrackPayload = {
  patientFirstName: "Priya",
  reportType:       "Lipid Profile",
  reportDate:       "18 Oct 2025",
  lang:             "hi",
  disclaimer:       "यह medical advice नहीं है। Doctor से consult करें।",
  hasCriticalValue: false,
  audioUrl:         staticFile('audio/sample.mp3'),
  avatarName:       "डॉ. Asha",
  avatarRole:       "MediTrack AI",

  beats: [
    {
      // Beat 1 · Greeting + scorecard overview
      startFrame: 0,
      endFrame:   135,
      caption:    "नमस्ते Priya जी, यह आपकी Dr. Lal PathLabs की lipid profile report का summary है",
      chart: {
        kind: "scorecard",
        title: "Lipid Profile — 4 values",
        items: [
          { label: "LDL",              status: "high",   displayValue: "142 mg/dL" },
          { label: "Total Cholesterol", status: "normal", displayValue: "178 mg/dL" },
          { label: "HDL",              status: "normal", displayValue: "52 mg/dL" },
          { label: "Triglycerides",    status: "normal", displayValue: "124 mg/dL" },
        ],
        rotation: -1,
      },
      lookAt: "chart",
    },
    {
      // Beat 2 · Headline finding — LDL
      startFrame: 135,
      endFrame:   240,
      caption:    "आपका LDL cholesterol 142 है — यह normal range से ऊपर है",
      chart: {
        kind:     "bigNumber",
        label:    "LDL CHOLESTEROL",
        value:    "142",
        unit:     "mg/dL",
        status:   "high",
        trend:    "up",
        delta:    "↑ above normal range",
        rotation: -2,
      },
      lookAt: "chart",
    },
    {
      // Beat 3 · LDL trend over 6 months
      startFrame: 240,
      endFrame:   375,
      caption:    "पिछले 6 महीनों में यह बढ़ता जा रहा है",
      chart: {
        kind:    "combinedSparkline",
        label:   "LDL CHOLESTEROL",
        value:   "142",
        unit:    "mg/dL",
        status:  "high",
        history: [
          { x: "May", y: 118 },
          { x: "Jun", y: 124 },
          { x: "Jul", y: 130 },
          { x: "Aug", y: 138 },
          { x: "Sep", y: 142 },
          { x: "Oct", y: 142 },
        ],
        rotation: -1,
      },
      lookAt: "chart",
    },
    {
      // Beat 4 · Other findings — all normal
      startFrame: 375,
      endFrame:   510,
      caption:    "बाकी values जैसे HDL, triglycerides normal range में हैं",
      chart: {
        kind: "bar",
        data: [
          { emoji: "✓", label: "Total cholesterol", value: 178, displayValue: "178 mg/dL", status: "success" },
          { emoji: "✓", label: "HDL",               value: 52,  displayValue: "52 mg/dL",  status: "success" },
          { emoji: "✓", label: "Triglycerides",     value: 124, displayValue: "124 mg/dL", status: "success" },
        ],
        rotations: [-1, 1, -1],
      },
      lookAt: "chart",
    },
    {
      // Beat 5 · Why it matters
      startFrame: 510,
      endFrame:   615,
      caption:    "LDL ज़्यादा होने से heart health पर असर पड़ सकता है",
      chart:      null,
      lookAt:     "viewer",
    },
    {
      // Beat 6 · Specific lifestyle action
      startFrame: 615,
      endFrame:   780,
      caption:    "कोई बड़ी बात नहीं है — अगले 4-6 हफ़्ते oily food कम करें और रोज़ 20 minute walk करें",
      chart:      null,
      lookAt:     "viewer",
    },
    {
      // Beat 7 · Doctor recommendation
      startFrame: 780,
      endFrame:   885,
      caption:    "3 महीने बाद यह value दोबारा check करवा लीजिए",
      chart:      null,
      lookAt:     "viewer",
    },
    {
      // Beat 8 · Closing scorecard
      startFrame: 885,
      endFrame:   1005,
      caption:    "यह था आपकी report का summary — Doctor से ज़रूर मिलें",
      chart: {
        kind: "scorecard",
        title: "Summary",
        items: [
          { label: "LDL",              status: "high",   displayValue: "142 mg/dL" },
          { label: "Total Cholesterol", status: "normal", displayValue: "178 mg/dL" },
          { label: "HDL",              status: "normal", displayValue: "52 mg/dL" },
          { label: "Triglycerides",    status: "normal", displayValue: "124 mg/dL" },
        ],
        rotation: 1,
      },
      lookAt: "chart",
    },
  ],
};
