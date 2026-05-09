import { SafetyError } from "./errors";

export function checkSafetyGates(patient: {
  ageYears: number;
  isPregnancyPanel: boolean;
}): void {
  if (patient.ageYears < 18) {
    throw new SafetyError(
      "specialist_required",
      "Pediatric report — video generation skipped",
    );
  }
  if (patient.isPregnancyPanel) {
    throw new SafetyError(
      "specialist_required",
      "Pregnancy panel — video generation skipped",
    );
  }
}
