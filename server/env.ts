import { config } from "dotenv";
import path from "node:path";

// dotenv never overrides a variable that is already set, so the FIRST file to
// define a key wins (and real env vars, e.g. Fly secrets, beat every file).
// .env is last: the fallback for local dev when the split files don't exist.
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env.server.local") });
config({ path: path.resolve(process.cwd(), ".env") });

import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  RENDER_API_KEY: z.string().min(1),

  // Redis (Upstash)
  REDIS_URL: z.string().min(1),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.string().optional(),

  // OpenAI + ElevenLabs — set now, used in prompt B
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o"),
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_VOICE_ID_HI: z.string().min(1),

  // Callback auth — sent as Bearer token to callbackUrl
  CALLBACK_SHARED_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function env(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues.map(
        (i) => `  ${i.path.join(".")}: ${i.message}`,
      );
      console.error(
        "Missing or invalid environment variables:\n" + missing.join("\n"),
      );
      process.exit(1);
    }
    _env = result.data;
  }
  return _env;
}
