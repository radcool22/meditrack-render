type LogLevel = "info" | "warn" | "error";

export function log(
  level: LogLevel,
  msg: string,
  fields?: Record<string, unknown>,
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}
