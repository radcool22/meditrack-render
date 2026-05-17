"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSafetyGates = void 0;
const errors_1 = require("./errors");
function checkSafetyGates(patient) {
    if (patient.ageYears < 18) {
        throw new errors_1.SafetyError("specialist_required", "Pediatric report — video generation skipped");
    }
    if (patient.isPregnancyPanel) {
        throw new errors_1.SafetyError("specialist_required", "Pregnancy panel — video generation skipped");
    }
}
exports.checkSafetyGates = checkSafetyGates;
