import * as fs from "node:fs";
import * as path from "node:path";
import { ScriptError } from "./errors";
import type { ScriptOutput } from "./script";
import type { Finding } from "../types";

// Load banned meds list once on module load
const BANNED_MEDS = fs
  .readFileSync(
    path.join(process.cwd(), "server/safety/banned-meds.txt"),
    "utf-8",
  )
  .split("\n")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Extract user-facing text strings from a chart spec.
 * Excludes structural fields (rotation, startFrame, endFrame, highlight, etc.).
 */
function extractChartText(chart: ScriptOutput["beats"][number]["chart"]): string[] {
  if (!chart) return [];
  const texts: string[] = [];

  if (chart.kind === "bigNumber") {
    texts.push(chart.value);
    if (chart.delta) texts.push(chart.delta);
  } else if (chart.kind === "bar") {
    for (const row of chart.data) {
      texts.push(String(row.value), row.displayValue);
    }
  } else if (chart.kind === "line") {
    for (const point of chart.data) {
      texts.push(String(point.y));
    }
  }

  return texts;
}

export function lintScript(script: ScriptOutput, findings: Finding[]): void {
  const captions = script.beats.map((b) => b.caption);
  const allCaptionText = captions.join(" ");

  // ── Rule 1: Banned diagnostic phrasing ────────────────────────────────────
  const diagnosticPatterns = [
    /aapko\s+.{1,30}\s+hai/gi,
    /आपको\s+.{1,30}\s+है/gi,
    /\bdiagnos[ei]s?\b/gi,
    /\bcondition\b/gi,
  ];
  for (const pattern of diagnosticPatterns) {
    const match = allCaptionText.match(pattern);
    if (match) {
      throw new ScriptError(
        "script_safety_violation",
        `Banned diagnostic phrase: "${match[0]}"`,
      );
    }
  }

  // ── Rule 2: Banned medication mentions ────────────────────────────────────
  for (const med of BANNED_MEDS) {
    const regex = new RegExp(`\\b${med}\\b`, "i");
    for (const caption of captions) {
      if (regex.test(caption)) {
        throw new ScriptError(
          "script_safety_violation",
          `Banned medication mention: ${med}`,
        );
      }
    }
    for (const beat of script.beats) {
      const chartJson = JSON.stringify(beat.chart);
      if (regex.test(chartJson)) {
        throw new ScriptError(
          "script_safety_violation",
          `Banned medication mention in chart: ${med}`,
        );
      }
    }
  }

  // ── Rule 3: Required doctor recommendation ────────────────────────────────
  const hasAbnormal = findings.some((f) =>
    ["high", "low", "critical_high", "critical_low"].includes(f.status),
  );
  if (hasAbnormal) {
    const hasDoctorMention = captions.some((c) => /doctor/i.test(c));
    if (!hasDoctorMention) {
      throw new ScriptError(
        "script_safety_violation",
        "Abnormal finding present but no doctor recommendation in script",
      );
    }
  }

  // ── Rule 4: Number grounding ──────────────────────────────────────────────
  // Collect all valid numbers from findings
  const groundedNumbers = new Set<number>();
  for (const f of findings) {
    groundedNumbers.add(f.value);
    if (f.referenceRange.low !== null) groundedNumbers.add(f.referenceRange.low);
    if (f.referenceRange.high !== null) groundedNumbers.add(f.referenceRange.high);
    if (f.history) {
      for (const h of f.history) groundedNumbers.add(h.value);
    }
  }

  for (const beat of script.beats) {
    // Check caption numbers
    const captionNums = beat.caption.match(/\d+(\.\d+)?/g) || [];
    for (const numStr of captionNums) {
      const num = parseFloat(numStr);
      if (!groundedNumbers.has(num)) {
        throw new ScriptError(
          "script_number_hallucination",
          `Number ${numStr} in caption does not match any finding`,
        );
      }
    }

    // Check user-facing chart values
    const chartTexts = beat.chart ? extractChartText(beat.chart) : [];
    for (const text of chartTexts) {
      const nums = String(text).match(/\d+(\.\d+)?/g) || [];
      for (const numStr of nums) {
        const num = parseFloat(numStr);
        if (!groundedNumbers.has(num)) {
          throw new ScriptError(
            "script_number_hallucination",
            `Number ${numStr} in chart does not match any finding`,
          );
        }
      }
    }
  }

  console.log("[lint] ok");
}
