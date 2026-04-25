// This is the exact shape the render worker receives from pipeline/render.py.
// In production these assets are in R2; for the sample we use local/public paths.
//
// The flow that produced this object:
//   1. Query       — SELECT ... FROM orders → result set
//   2. Profile     — computed deltas + anomalies → `metrics` below
//   3. Draft       — Claude produced the `beats` (with {{metric.*}} tokens)
//   4. Approve     — analyst edited + clicked "Approve & render"
//   5. Resolve     — tokens replaced with values from `metrics`
//   6. Voice       — ElevenLabs produced `audioUrl`
//   7. Avatar      — HeyGen produced `avatarVideoUrl` (lip-synced to audio)

export type ChartSpec =
  | { kind: "bigNumber"; value: string; label: string; delta?: string; trend?: "up" | "down" }
  | { kind: "bar"; data: { label: string; value: number }[]; highlight?: number }
  | { kind: "line"; data: { x: string; y: number }[]; highlight?: number };

export type Beat = {
  startFrame: number;
  endFrame: number;
  caption: string;
  chart: ChartSpec;
};

export type BriefPayload = {
  title: string;
  author: string;
  sourceQueryLabel: string;
  audioUrl: string;
  avatarVideoUrl: string;
  beats: Beat[];
};

// Sample payload — 10 seconds / 300 frames at 30fps
export const sampleBrief: BriefPayload = {
  title: "Checkout conversion dropped this week",
  author: "Priya Shah · Analytics",
  sourceQueryLabel: "orders_weekly.sql · ran 2m ago",
  // In production these are signed R2 URLs. Swap in real ones to render for real.
  audioUrl: "", // intentionally empty for the sample — see README
  avatarVideoUrl: "", // intentionally empty for the sample — see README

  beats: [
    {
      // 0–2.5s — HOOK
      startFrame: 0,
      endFrame: 75,
      caption: "Checkout conversion fell to 2.1% this week.",
      chart: {
        kind: "bigNumber",
        value: "2.1%",
        label: "Checkout conversion · last 7 days",
        delta: "−0.8 pp vs prior week",
        trend: "down",
      },
    },
    {
      // 2.5–6s — WHAT CHANGED
      startFrame: 75,
      endFrame: 180,
      caption: "Mobile is the whole drop — desktop held flat.",
      chart: {
        kind: "bar",
        data: [
          { label: "Desktop", value: 3.4 },
          { label: "Mobile", value: 1.6 },
          { label: "Tablet", value: 2.2 },
        ],
        highlight: 1,
      },
    },
    {
      // 6–10s — WHY + ASK
      startFrame: 180,
      endFrame: 300,
      caption: "Mobile checkout latency spiked Tuesday. Eng — can we look?",
      chart: {
        kind: "line",
        data: [
          { x: "Mon", y: 820 },
          { x: "Tue", y: 1840 },
          { x: "Wed", y: 1910 },
          { x: "Thu", y: 1780 },
          { x: "Fri", y: 1650 },
          { x: "Sat", y: 1600 },
          { x: "Sun", y: 1590 },
        ],
        highlight: 1,
      },
    },
  ],
};
