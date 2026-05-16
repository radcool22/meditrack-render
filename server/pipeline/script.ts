import * as fs from "node:fs";
import * as path from "node:path";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "../env";
import { SafetyError, ScriptError } from "./errors";
import type { Finding } from "../types";

// Read prompt once on module load
const PROMPT_PATH = path.join(process.cwd(), "prompts/draft_script.md");
let PROMPT_TEXT: string;
try {
  PROMPT_TEXT = fs.readFileSync(PROMPT_PATH, "utf-8");
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    console.error(
      `[script] FATAL: prompts/draft_script.md not found at ${PROMPT_PATH}.\n` +
        "This file must exist at build time and be copied into the runtime image.\n" +
        "Check the Dockerfile COPY directives.",
    );
  }
  throw err;
}

// ── Zod schema for LLM output ───────────────────────────────────────────────

const medicalStatus = z.enum(["normal", "borderline", "high", "low", "critical"]);

const chartSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("bigNumber"),
    label: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    delta: z.string().optional(),
    trend: z.enum(["up", "down", "flat"]).optional(),
    status: medicalStatus.optional(),
    rotation: z.number().optional(),
  }),
  z.object({
    kind: z.literal("bar"),
    data: z.array(
      z.object({
        label: z.string(),
        emoji: z.string(),
        value: z.number(),
        displayValue: z.string(),
        status: z.enum(["success", "danger"]),
      }),
    ),
    rotations: z.array(z.number()).optional(),
  }),
  z.object({
    kind: z.literal("line"),
    title: z.string(),
    titleEmoji: z.string(),
    data: z.array(z.object({ x: z.string(), y: z.number() })),
    highlight: z.number().optional(),
    rotation: z.number().optional(),
  }),
  z.object({
    kind: z.literal("scorecard"),
    title: z.string().optional(),
    items: z.array(
      z.object({
        label: z.string(),
        status: medicalStatus,
        displayValue: z.string().optional(),
      }),
    ).min(1),
    rotation: z.number().optional(),
  }),
  z.object({
    kind: z.literal("combinedSparkline"),
    label: z.string(),
    value: z.string(),
    unit: z.string(),
    status: medicalStatus,
    history: z.array(z.object({ x: z.string(), y: z.number() })).min(2),
    rotation: z.number().optional(),
  }),
]);

const scriptOutputSchema = z.object({
  patientFirstName: z.string(),
  reportType: z.string(),
  reportDate: z.string(),
  lang: z.literal("hi"),
  hasCriticalValue: z.boolean(),
  beats: z
    .array(
      z.object({
        startFrame: z.number(),
        endFrame: z.number(),
        caption: z.string(),
        chart: chartSpecSchema.nullable().optional(),
        lookAt: z.enum(["chart", "viewer"]).optional(),
      }),
    )
    .min(1),
});

export type ScriptOutput = z.infer<typeof scriptOutputSchema>;

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .trim();
}

export async function generateScript(
  patient: { firstName: string; ageYears: number; isPregnancyPanel: boolean },
  report: { type: string; date: string; lab: string },
  findings: Finding[],
): Promise<ScriptOutput> {
  const e = env();
  const openai = new OpenAI({ apiKey: e.OPENAI_API_KEY });
  const userContent = JSON.stringify({ patient, report, findings });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: PROMPT_TEXT },
    { role: "user", content: userContent },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1) {
      messages.push({
        role: "system",
        content:
          "Your previous response was not valid JSON. Return ONLY a JSON object, no prose, no markdown.",
      });
    }

    const response = await openai.chat.completions.create({
      model: e.OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      if (attempt === 1) {
        throw new ScriptError(
          "script_generation_failed",
          "LLM returned empty response after retry",
        );
      }
      continue;
    }

    const cleaned = stripCodeFences(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      if (attempt === 1) {
        throw new ScriptError(
          "script_generation_failed",
          "LLM did not return parseable JSON after retry",
        );
      }
      continue;
    }

    // Backup safety check — LLM may return specialist_required
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Record<string, unknown>).error === "specialist_required"
    ) {
      throw new SafetyError(
        "specialist_required",
        String(
          (parsed as Record<string, unknown>).message || "Specialist required",
        ),
      );
    }

    const validated = scriptOutputSchema.safeParse(parsed);
    if (!validated.success) {
      if (attempt === 1) {
        const details = validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new ScriptError(
          "script_generation_failed",
          `LLM output did not match expected schema: ${details}`,
        );
      }
      continue;
    }

    return validated.data;
  }

  throw new ScriptError(
    "script_generation_failed",
    "Script generation failed after all attempts",
  );
}
