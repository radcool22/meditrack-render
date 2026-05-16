import * as fs from "node:fs";
import * as path from "node:path";
import { ScriptError } from "./errors";
import { log } from "../log";
import type { ScriptOutput } from "./script";
import type { Finding } from "../types";

// Load banned meds list once on module load
const BANNED_MEDS_PATH = path.join(process.cwd(), "server/safety/banned-meds.txt");
let BANNED_MEDS: string[];
try {
  BANNED_MEDS = fs
    .readFileSync(BANNED_MEDS_PATH, "utf-8")
    .split("\n")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    console.error(
      `[lint] FATAL: banned-meds.txt not found at ${BANNED_MEDS_PATH}.\n` +
        "This file must exist at build time and be copied into the runtime image.\n" +
        "Check the Dockerfile COPY directives.",
    );
  }
  throw err;
}

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
  } else if (chart.kind === "scorecard") {
    for (const item of chart.items) {
      if (item.displayValue) texts.push(item.displayValue);
    }
  } else if (chart.kind === "combinedSparkline") {
    texts.push(chart.value);
    for (const point of chart.history) {
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

  // Contextual time/duration pattern: integers 1-30 (ASCII or Devanagari digits)
  // followed by a time unit word in Latin or Devanagari script.
  // Also handles ranges like "4-6 hafte". \b doesn't work reliably at
  // Latin/Devanagari boundaries, so we avoid word-boundary anchors on the unit side.
  const LATIN_UNITS =
    "mahine?|mahino|hafte?|hafton|din|dino|saal|saalon|ghante?|minutes?|baar|dafa|months?|weeks?|days?|years?";
  const DEVA_UNITS =
    "महीने|महीनों|महीना|महीनो|हफ़्ते|हफ़्ता|हफ्ते|हफ्ता|दिन|दिनों|साल|सालों|वर्ष|वर्षों|घंटे|घंटा|घंटों|मिनट|मिनटों|बार";
  const DIGIT = String.raw`[\d\u0966-\u096F]`; // ASCII + Devanagari digits
  const timePattern = new RegExp(
    `(${DIGIT}{1,2})(?:-(${DIGIT}{1,2}))?\\s*(?:${LATIN_UNITS}|${DEVA_UNITS})`,
    "gi",
  );

  /** Convert ASCII or Devanagari digit string to a JS number */
  function parseDigits(s: string): number {
    const ascii = s.replace(/[\u0966-\u096F]/g, (ch) =>
      String(ch.charCodeAt(0) - 0x0966),
    );
    return parseInt(ascii, 10);
  }

  for (let beatIdx = 0; beatIdx < script.beats.length; beatIdx++) {
    const beat = script.beats[beatIdx];
    // First, find contextual time numbers to exempt from caption grounding
    const exemptNumbers = new Set<string>();
    let timeMatch;
    timePattern.lastIndex = 0;
    while ((timeMatch = timePattern.exec(beat.caption)) !== null) {
      const num1 = parseDigits(timeMatch[1]);
      const num2 = timeMatch[2] ? parseDigits(timeMatch[2]) : null;
      if (num1 >= 1 && num1 <= 30) {
        exemptNumbers.add(String(num1));
        console.log(
          `[lint] skipped contextual number: "${timeMatch[0].trim()}" (context: time reference)`,
        );
      }
      if (num2 !== null && num2 >= 1 && num2 <= 30) {
        exemptNumbers.add(String(num2));
        console.log(
          `[lint] skipped contextual number: "${num2}" from range "${timeMatch[0].trim()}" (context: time reference)`,
        );
      }
    }

    // Check caption numbers
    const captionNums = beat.caption.match(/\d+(\.\d+)?/g) || [];
    for (const numStr of captionNums) {
      // Skip contextual time numbers (integers only, no decimals)
      if (exemptNumbers.has(numStr) && !numStr.includes(".")) continue;

      const num = parseFloat(numStr);
      if (!groundedNumbers.has(num)) {
        log("warn", "Number grounding violation", {
          number: numStr,
          caption: beat.caption,
          beatIndex: beatIdx,
        });
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

  log("info", "Lint passed", {});
}
