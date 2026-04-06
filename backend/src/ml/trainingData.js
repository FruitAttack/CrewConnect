/**
 * Synthetic training data generator for the budget prediction model.
 *
 * Each sample represents a construction project at some point mid-execution.
 * Features are designed to match what we can extract from real project data.
 *
 * FEATURE ORDER (must stay consistent with budgetPredictor.js):
 *  0  pct_budget_hours_consumed   actual_hours / budgeted_hours
 *  1  burn_rate_ratio             actual burn rate vs expected burn rate
 *  2  pct_cost_codes_over_budget  fraction of cost codes already over their hour budget
 *  3  pct_time_elapsed            days since start / estimated project duration
 *  4  avg_hours_variance_pct      avg (actual - budget) / budget across cost codes
 *  5  schedule_pressure           pct_budget_consumed / pct_time_elapsed (>1 = burning fast)
 *  6  inactivity_score            normalized days since last time entry (0=recent, 1=stale)
 */

export const FEATURE_NAMES = [
  'pct_budget_hours_consumed',
  'burn_rate_ratio',
  'pct_cost_codes_over_budget',
  'pct_time_elapsed',
  'avg_hours_variance_pct',
  'schedule_pressure',
  'inactivity_score',
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function gauss(mean = 0, std = 1) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate one synthetic project sample.
 * Returns { features: number[], label: 0|1 }
 */
function generateSample() {
  // Randomly decide if this will be an over-budget project (balanced classes)
  const trueOverBudget = Math.random() < 0.5;

  let f;

  if (trueOverBudget) {
    // Projects that end up over budget tend to show early warning signs
    const pctTime = rand(0.1, 1.0);

    const pctBudgetConsumed = clamp(
      pctTime * rand(1.1, 2.0) + gauss(0, 0.1),   // consuming faster than timeline
      0, 3
    );

    const burnRateRatio = clamp(gauss(1.4, 0.3), 0.8, 3.0);

    const pctCCOver = clamp(rand(0.3, 1.0) + gauss(0, 0.05), 0, 1);

    const avgVariance = clamp(gauss(0.35, 0.2), -0.2, 2.0);

    const schedulePressure = pctTime > 0.05
      ? clamp(pctBudgetConsumed / pctTime, 0, 4)
      : clamp(burnRateRatio, 0, 4);

    const inactivity = clamp(gauss(0.15, 0.15), 0, 1); // mostly active

    f = [pctBudgetConsumed, burnRateRatio, pctCCOver, pctTime, avgVariance, schedulePressure, inactivity];
  } else {
    // Projects on track
    const pctTime = rand(0.05, 1.0);

    const pctBudgetConsumed = clamp(
      pctTime * rand(0.5, 1.0) + gauss(0, 0.05),
      0, 1.05
    );

    const burnRateRatio = clamp(gauss(0.85, 0.2), 0.3, 1.2);

    const pctCCOver = clamp(rand(0, 0.35) + gauss(0, 0.05), 0, 0.6);

    const avgVariance = clamp(gauss(-0.1, 0.15), -0.5, 0.4);

    const schedulePressure = pctTime > 0.05
      ? clamp(pctBudgetConsumed / pctTime, 0, 1.5)
      : clamp(burnRateRatio, 0, 1.5);

    const inactivity = clamp(gauss(0.1, 0.1), 0, 0.8);

    f = [pctBudgetConsumed, burnRateRatio, pctCCOver, pctTime, avgVariance, schedulePressure, inactivity];
  }

  // Add a small amount of label noise to prevent overfit and model real-world uncertainty
  const noise = Math.random() < 0.07;
  const label = noise ? (trueOverBudget ? 0 : 1) : (trueOverBudget ? 1 : 0);

  return { features: f, label };
}

/**
 * Generate n synthetic training samples.
 * @param {number} n
 * @returns {{ X: number[][], y: number[] }}
 */
export function generateTrainingData(n = 2000) {
  const X = [];
  const y = [];

  for (let i = 0; i < n; i++) {
    const sample = generateSample();
    X.push(sample.features);
    y.push(sample.label);
  }

  return { X, y };
}

/**
 * Compute per-feature mean and std from training data for normalization.
 */
export function computeNormParams(X) {
  const nFeatures = X[0].length;
  const means = new Array(nFeatures).fill(0);
  const stds  = new Array(nFeatures).fill(1);

  for (let j = 0; j < nFeatures; j++) {
    const col = X.map(row => row[j]);
    const mean = col.reduce((a, b) => a + b, 0) / col.length;
    const variance = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
    means[j] = mean;
    stds[j]  = Math.sqrt(variance) || 1;
  }

  return { means, stds };
}

/**
 * Normalize a feature matrix using pre-computed mean/std.
 */
export function normalize(X, means, stds) {
  return X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
}

/**
 * Normalize a single feature vector.
 */
export function normalizeOne(x, means, stds) {
  return x.map((v, j) => (v - means[j]) / stds[j]);
}
