import { z } from "zod";

// ── Finding schema (shared by validation + pipeline) ────────────────────────

const findingSchema = z.object({
  valueName: z.string(),
  value: z.number(),
  unit: z.string(),
  referenceRange: z.object({
    low: z.number().nullable(),
    high: z.number().nullable(),
  }),
  status: z.enum(["normal", "low", "high", "critical_low", "critical_high"]),
  history: z
    .array(z.object({ date: z.string(), value: z.number() }))
    .nullable(),
});

export type Finding = z.infer<typeof findingSchema>;

// ── Request validation ──────────────────────────────────────────────────────

export const renderRequestSchema = z.object({
  reportId: z.string().min(1),
  callbackUrl: z.string().url(),
  patient: z.object({
    // May be empty when the user never gave a name — the prompt then greets
    // without one instead of saying "Patient जी".
    firstName: z.string().max(60),
    ageYears: z.number().int().positive(),
    isPregnancyPanel: z.boolean(),
  }),
  report: z.object({
    type: z.string().min(1),
    date: z.string(),
    lab: z.string(),
  }),
  findings: z.array(findingSchema).min(1),
  lang: z.literal("hi"),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;

export type RenderJobData = RenderRequest & {
  jobId: string;
};

// ── Callback shapes ─────────────────────────────────────────────────────────

export type CallbackBody = { jobId: string; reportId: string } & (
  | { status: "completed"; videoUrl: string; durationSec: number }
  | { status: "failed"; error: string; message: string }
);
