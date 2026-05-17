"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineError = exports.ScriptError = exports.SafetyError = void 0;
class SafetyError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "SafetyError";
    }
}
exports.SafetyError = SafetyError;
class ScriptError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "ScriptError";
    }
}
exports.ScriptError = ScriptError;
class PipelineError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "PipelineError";
    }
}
exports.PipelineError = PipelineError;
