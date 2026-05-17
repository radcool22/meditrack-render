"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    // Server
    PORT: zod_1.z.coerce.number().default(3000),
    RENDER_API_KEY: zod_1.z.string().min(1),
    // Redis (Upstash)
    REDIS_URL: zod_1.z.string().min(1),
    // Cloudflare R2
    R2_ACCOUNT_ID: zod_1.z.string().min(1),
    R2_ACCESS_KEY_ID: zod_1.z.string().min(1),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().min(1),
    R2_BUCKET: zod_1.z.string().min(1),
    R2_PUBLIC_BASE_URL: zod_1.z.string().optional(),
    // OpenAI + ElevenLabs — set now, used in prompt B
    OPENAI_API_KEY: zod_1.z.string().min(1),
    OPENAI_MODEL: zod_1.z.string().min(1).default("gpt-4o"),
    ELEVENLABS_API_KEY: zod_1.z.string().min(1),
    ELEVENLABS_VOICE_ID_HI: zod_1.z.string().min(1),
});
let _env = null;
function env() {
    if (!_env) {
        const result = envSchema.safeParse(process.env);
        if (!result.success) {
            const missing = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
            console.error("Missing or invalid environment variables:\n" + missing.join("\n"));
            process.exit(1);
        }
        _env = result.data;
    }
    return _env;
}
exports.env = env;
