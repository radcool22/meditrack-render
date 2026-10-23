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

/** Devanagari digits → ASCII, so grounding can't be bypassed by writing "९९.९". */
function toAsciiDigits(s: string): string {
  return s.replace(/[०-९]/g, (ch) => String(ch.charCodeAt(0) - 0x0966));
}

/**
 * Numbers a viewer reads as values. Digits that belong to a test name
 * (HbA1c, B12, T3, omega-3) are skipped: a number directly after a Latin
 * letter, or after "letter-". Indian grouping ("1,50,000") reads as one number.
 */
function extractValueNumbers(text: string): string[] {
  const matches =
    toAsciiDigits(text).match(/(?<![A-Za-z\d.,])(?<![A-Za-z]-)\d+(?:,\d{2,3})*(?:\.\d+)?/g) || [];
  return matches.map((n) => n.replace(/,/g, ""));
}

export function lintScript(
  script: ScriptOutput,
  findings: Finding[],
  report?: { date: string },
): void {
  const captions = script.beats.map((b) => b.caption);
  const allCaptionText = captions.join(" ");

  // ── Rule 1: Banned diagnostic phrasing ────────────────────────────────────
  // Targets "you HAVE <disease/problem>" — not advice like "आपको रोज़ walk
  // करना है" and not reassurance like "आपको कोई problem नहीं है".
  const NOT_NEGATED = String.raw`(?!\s+(?:नहीं|nahi))`;
  const diagnosticPatterns = [
    new RegExp(
      String.raw`(?:aapko|आपको)\s+(?:\S+\s+){0,3}(?:problem|bimari|bimaari|बीमारी|समस्या|रोग|disease)` + NOT_NEGATED,
      "i",
    ),
    new RegExp(
      String.raw`(?:aapko|आपको)\s+(?:diabetes|thyroid|anemia|anaemia|cancer|hypertension|pcos|pcod|डायबिटीज़?|शुगर)` + NOT_NEGATED,
      "i",
    ),
    /\bdiagnos[ei]s?\b/i,
    /\bcondition\b/i,
  ];
  for (const pattern of diagnosticPatterns) {
    const match = allCaptionText.match(pattern);
    if (match) {
      throw new ScriptError(
        "script_safety_violation",
        `Banned diagnostic phrasing (pattern ${diagnosticPatterns.indexOf(pattern)})`,
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
    const hasDoctorMention = captions.some((c) => /doctor|डॉक्टर|डाक्टर/i.test(c));
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

  // Units like "10^3/µL" or "mm/1st hr" contain digits that aren't values.
  const digitUnits = findings.map((f) => f.unit).filter((u) => /\d/.test(u));
  const stripUnits = (text: string) =>
    digitUnits.reduce((t, u) => t.split(u).join(" "), text);

  // The report date may be spoken ("18 October 2025"); its parts are grounded.
  for (const dateText of [report?.date ?? "", script.reportDate]) {
    for (const n of extractValueNumbers(dateText)) groundedNumbers.add(parseFloat(n));
  }

  // Contextual time/quantity pattern: integers 1-30 followed by a time or
  // everyday-quantity word in Latin or Devanagari script ("6 महीने",
  // "20-30 min", "2 गिलास"). Also handles ranges like "4-6 hafte". \b doesn't
  // work at Latin/Devanagari boundaries, so the unit side has no anchor.
  const LATIN_UNITS =
    "mahine?|mahino|hafte?|hafton|din|dino|saal|saalon|ghante?|minutes?|mins?|hours?|hrs?|baar|dafa|months?|weeks?|days?|years?|glass(?:es)?|litres?|liters?|kg";
  const DEVA_UNITS =
    "महीने|महीनों|महीना|महीनो|हफ़्ते|हफ़्ता|हफ्ते|हफ्ता|दिन|दिनों|साल|सालों|वर्ष|वर्षों|घंटे|घंटा|घंटों|मिनट|मिनटों|बार|गिलास|लीटर|किलो";
  const timePattern = new RegExp(
    String.raw`(\d{1,2})(?:-(\d{1,2}))?\s*(?:${LATIN_UNITS}|${DEVA_UNITS})`,
    "gi",
  );

  for (let beatIdx = 0; beatIdx < script.beats.length; beatIdx++) {
    const beat = script.beats[beatIdx];
    const caption = stripUnits(toAsciiDigits(beat.caption));
    // First, find contextual time numbers to exempt from caption grounding
    const exemptNumbers = new Set<string>();
    let timeMatch;
    timePattern.lastIndex = 0;
    while ((timeMatch = timePattern.exec(caption)) !== null) {
      for (const part of [timeMatch[1], timeMatch[2]]) {
        if (part === undefined) continue;
        const n = parseInt(part, 10);
        if (n >= 1 && n <= 30) exemptNumbers.add(String(n));
      }
    }

    // Check caption numbers
    for (const numStr of extractValueNumbers(caption)) {
      // Skip contextual time numbers (integers only, no decimals)
      if (exemptNumbers.has(numStr) && !numStr.includes(".")) continue;

      const num = parseFloat(numStr);
      if (!groundedNumbers.has(num)) {
        // No caption text in logs — it carries the patient's report content.
        log("warn", "Number grounding violation", { beatIndex: beatIdx });
        throw new ScriptError(
          "script_number_hallucination",
          `Number ${numStr} in caption does not match any finding`,
        );
      }
    }

    // Check user-facing chart values
    const chartTexts = beat.chart ? extractChartText(beat.chart) : [];
    for (const text of chartTexts) {
      for (const numStr of extractValueNumbers(stripUnits(String(text)))) {
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
