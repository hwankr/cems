import type {
  EnergyComparison,
  EnergyReading,
  EnergyStatus,
  EnergySummary,
} from "./types";

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getStatus(deltaKwh: number): EnergyStatus {
  if (deltaKwh < -0.01) return "saving";
  if (deltaKwh > 0.01) return "overuse";
  return "neutral";
}

export function compareEnergy(reading: EnergyReading): EnergyComparison {
  const deltaKwh = round(reading.actualKwh - reading.forecastKwh, 2);
  const savingsKwh = Math.max(
    0,
    round(reading.forecastKwh - reading.actualKwh, 2),
  );
  const overuseKwh = Math.max(
    0,
    round(reading.actualKwh - reading.forecastKwh, 2),
  );
  const savingsRate =
    reading.forecastKwh > 0 ? round(savingsKwh / reading.forecastKwh, 4) : 0;

  return {
    ...reading,
    deltaKwh,
    savingsKwh,
    overuseKwh,
    savingsRate,
    status: getStatus(deltaKwh),
  };
}

export function summarizeEnergy(
  comparisons: EnergyComparison[],
): EnergySummary {
  const actualKwh = round(
    comparisons.reduce((sum, item) => sum + item.actualKwh, 0),
    2,
  );
  const forecastKwh = round(
    comparisons.reduce((sum, item) => sum + item.forecastKwh, 0),
    2,
  );
  const savingsKwh = round(
    comparisons.reduce((sum, item) => sum + item.savingsKwh, 0),
    2,
  );
  const overuseKwh = round(
    comparisons.reduce((sum, item) => sum + item.overuseKwh, 0),
    2,
  );
  const netDeltaKwh = round(actualKwh - forecastKwh, 2);
  const netSavingsRate =
    forecastKwh > 0
      ? round(Math.max(0, forecastKwh - actualKwh) / forecastKwh, 4)
      : 0;

  return {
    actualKwh,
    forecastKwh,
    savingsKwh,
    overuseKwh,
    netDeltaKwh,
    netSavingsRate,
  };
}
