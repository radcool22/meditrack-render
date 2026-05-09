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
      trend?: "up" | "down";
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

// ─── Sample payload — lipid profile, 10 s / 300 frames @ 30 fps ──────────────
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
      // Beat 1 · 0–3 s · HOOK — LDL is the abnormal value
      startFrame: 0,
      endFrame:   90,
      caption:    "नमस्ते Priya जी, आपकी lipid report तैयार है",
      chart: {
        kind:     "bigNumber",
        value:    "142",
        label:    "LDL CHOLESTEROL",
        unit:     "mg/dL",
        trend:    "down",
        delta:    "↑ borderline high",
        rotation: -2,
      },
    },
    {
      // Beat 2 · 3–7 s · REASSURANCE — the rest of the panel is normal
      startFrame: 90,
      endFrame:   210,
      caption:    "बाकी सब values normal हैं",
      chart: {
        kind: "bar",
        data: [
          { emoji: "✓", label: "Total cholesterol", value: 178, displayValue: "178 mg/dL", status: "success" },
          { emoji: "✓", label: "HDL",               value: 52,  displayValue: "52 mg/dL",  status: "success" },
          { emoji: "✓", label: "Triglycerides",     value: 124, displayValue: "124 mg/dL", status: "success" },
        ],
        rotations: [-1, 1, -1],
      },
    },
    {
      // Beat 3 · 7–10 s · ACTION — LDL trend is the ask
      startFrame: 210,
      endFrame:   300,
      caption:    "थोड़ा ध्यान दें — Doctor से ज़रूर मिलें",
      lookAt:     "chart",
      chart: {
        kind:       "line",
        title:      "LDL trend (last 6 months)",
        titleEmoji: "📈",
        data: [
          { x: "May", y: 118 },
          { x: "Jun", y: 124 },
          { x: "Jul", y: 130 },
          { x: "Aug", y: 138 },
          { x: "Sep", y: 142 },
          { x: "Oct", y: 142 },
        ],
        highlight: 5,
        rotation: -1,
      },
    },
    {
      // Beat 4 · 10–12 s · CLOSING — doctor recommendation, no chart
      startFrame: 300,
      endFrame:   360,
      caption:    "Doctor से ज़रूर मिलें",
      chart:      null,
      lookAt:     "viewer",
    },
  ],
};
