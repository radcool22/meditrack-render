import { z } from "zod";

const beatSchema = z
  .object({
    startFrame: z.number(),
    endFrame: z.number(),
    caption: z.string(),
    chart: z.record(z.unknown()),
  })
  .passthrough();

const payloadSchema = z
  .object({
    patientFirstName: z.string(),
    reportType: z.string(),
    reportDate: z.string(),
    lang: z.enum(["hi", "en"]),
    disclaimer: z.string().min(1),
    hasCriticalValue: z.boolean(),
    audioUrl: z.string(),
    avatarName: z.string(),
    avatarRole: z.string(),
    beats: z.array(beatSchema).min(1),
  })
  .passthrough();

export const renderRequestSchema = z.object({
  reportId: z.string().min(1),
  callbackUrl: z.string().url(),
  payload: payloadSchema,
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;

export type RenderJobData = RenderRequest & {
  jobId: string;
};

export type CallbackBody = { jobId: string; reportId: string } & (
  | { status: "completed"; videoUrl: string; durationSec: number }
  | { status: "failed"; error: string; message: string }
);
