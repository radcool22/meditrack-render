"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRequestSchema = void 0;
const zod_1 = require("zod");
// ── Finding schema (shared by validation + pipeline) ────────────────────────
const findingSchema = zod_1.z.object({
    valueName: zod_1.z.string(),
    value: zod_1.z.number(),
    unit: zod_1.z.string(),
    referenceRange: zod_1.z.object({
        low: zod_1.z.number().nullable(),
        high: zod_1.z.number().nullable(),
    }),
    status: zod_1.z.enum(["normal", "low", "high", "critical_low", "critical_high"]),
    history: zod_1.z
        .array(zod_1.z.object({ date: zod_1.z.string(), value: zod_1.z.number() }))
        .nullable(),
});
// ── Request validation ──────────────────────────────────────────────────────
exports.renderRequestSchema = zod_1.z.object({
    reportId: zod_1.z.string().min(1),
    callbackUrl: zod_1.z.string().url(),
    patient: zod_1.z.object({
        firstName: zod_1.z.string().min(1),
        ageYears: zod_1.z.number().int().positive(),
        isPregnancyPanel: zod_1.z.boolean(),
    }),
    report: zod_1.z.object({
        type: zod_1.z.string().min(1),
        date: zod_1.z.string(),
        lab: zod_1.z.string(),
    }),
    findings: zod_1.z.array(findingSchema).min(1),
    lang: zod_1.z.literal("hi"),
});
