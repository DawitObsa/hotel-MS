export function isBloodPressureValid(systolic, diastolic) {
  return Number.isFinite(systolic) && Number.isFinite(diastolic) && diastolic < systolic;
}
