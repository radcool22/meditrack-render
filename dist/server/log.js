"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
function log(level, msg, fields) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        msg,
        ...fields,
    };
    const line = JSON.stringify(entry);
    if (level === "error")
        process.stderr.write(line + "\n");
    else
        process.stdout.write(line + "\n");
}
exports.log = log;
