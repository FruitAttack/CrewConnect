/**
 * Budget Predictor — trains the model once on startup, then serves predictions.
 *
 * Workflow:
 *  1. Generate synthetic training data
 *  2. Normalize features
 *  3. Train logistic regression
 *  4. Store model + norm params in memory
 *  5. extractFeatures() pulls live data from Supabase and builds the feature vector
 *  6. predict() runs inference and returns a structured result
 */

import { train, predict, featureContributions } from './logisticRegression.js';
import {
  FEATURE_NAMES,
  generateTrainingData,
  computeNormParams,
  normalize,
  normalizeOne,
} from './trainingData.js';
import { supabase } from '../utils/supabase.js';

// ─── Model singleton ──────────────────────────────────────────────────────────

let _model     = null;
let _normMeans = null;
let _normStds  = null;
let _accuracy  = null;

/**
 * Train the model. Called once when the server starts.
 * Uses 80/20 train/test split to report accuracy.
 */
export async function initModel() {
  console.log('[BudgetPredictor] Training model...');

  // 1. Synthetic baseline
  const { X: X_synth, y: y_synth } = generateTrainingData(3000);

  // 2. Real labeled samples from Supabase (added manually or from completed projects)
  let X_real = [];
  let y_real = [];
  try {
    const { data: samples, error } = await supabase
      .from('ml_training_samples')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (samples && samples.length > 0) {
      for (const s of samples) {
        X_real.push([
          s.pct_budget_hours_consumed,
          s.burn_rate_ratio,
          s.pct_cost_codes_over_budget,
          s.pct_time_elapsed,
          s.avg_hours_variance_pct,
          s.schedule_pressure,
          s.inactivity_score,
        ]);
        y_real.push(s.went_over_budget ? 1 : 0);
      }
      console.log(`[BudgetPredictor] Loaded ${samples.length} real training samples from Supabase.`);
    } else {
      console.log('[BudgetPredictor] No real training samples found — using synthetic data only.');
    }
  } catch (err) {
    console.warn('[BudgetPredictor] Could not load real training samples:', err.message);
  }

  // 3. Combine: real samples first (higher signal), then synthetic
  const X_combined = [...X_real, ...X_synth];
  const y_combined = [...y_real, ...y_synth];

  // 4. Shuffle combined set
  for (let i = X_combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [X_combined[i], X_combined[j]] = [X_combined[j], X_combined[i]];
    [y_combined[i], y_combined[j]] = [y_combined[j], y_combined[i]];
  }

  // 5. 80/20 split
  const splitIdx = Math.floor(X_combined.length * 0.8);
  const X_train  = X_combined.slice(0, splitIdx);
  const y_train  = y_combined.slice(0, splitIdx);
  const X_test   = X_combined.slice(splitIdx);
  const y_test   = y_combined.slice(splitIdx);

  const { means, stds } = computeNormParams(X_train);
  _normMeans = means;
  _normStds  = stds;

  const X_train_norm = normalize(X_train, means, stds);
  const X_test_norm  = normalize(X_test,  means, stds);

  _model = train(X_train_norm, y_train, {
    learningRate: 0.1,
    epochs:       3000,
    lambda:       0.01,
    featureNames: FEATURE_NAMES,
  });

  // 6. Evaluate on test set
  let correct = 0;
  for (let i = 0; i < X_test_norm.length; i++) {
    const p = predict(X_test_norm[i], _model);
    if ((p >= 0.5 ? 1 : 0) === y_test[i]) correct++;
  }
  _accuracy = correct / X_test_norm.length;

  const realCount = X_real.length;
  console.log(`[BudgetPredictor] Training complete. ${realCount} real + ${X_synth.length} synthetic samples. Test accuracy: ${(_accuracy * 100).toFixed(1)}%`);
}

// ─── Feature extraction ───────────────────────────────────────────────────────

/**
 * Pull project data from Supabase and compute the feature vector.
 * @param {string} projectId
 * @param {string} companyId
 * @returns {{ features: number[], meta: object }}
 */
export async function extractFeatures(projectId, companyId) {
  // Fetch project + cost codes + time entries in parallel
  const [projectRes, costCodesRes, timeEntriesRes, usersRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('project_cost_codes').select('*, cost_code:cost_code_id(id, code, name)').eq('project_id', projectId),
    supabase.from('time_entries').select('*').eq('project_id', projectId).not('clock_out', 'is', null),
    supabase.from('user_employment').select('user_id, hourly_rate, salary_annual').eq('company_id', companyId),
  ]);

  const project    = projectRes.data;
  const costCodes  = costCodesRes.data || [];
  const entries    = timeEntriesRes.data || [];
  const employment = usersRes.data || [];

  if (!project) throw new Error('Project not found');

  // Build hourly rate lookup
  const rateByUser = {};
  for (const e of employment) {
    const hourly = parseFloat(e.hourly_rate) || 0;
    const salary = parseFloat(e.salary_annual) || 0;
    rateByUser[e.user_id] = hourly > 0 ? hourly : salary > 0 ? salary / (52 * 40) : 0;
  }

  // ── Aggregate time entries ───────────────────────────────────────────────
  let totalActualHours = 0;
  let totalActualCost  = 0;
  let lastEntryDate    = null;
  const hoursByCostCode = {};

  for (const entry of entries) {
    if (!entry.clock_in || !entry.clock_out) continue;
    const hrs = Math.max(0, (new Date(entry.clock_out) - new Date(entry.clock_in)) / 36e5 - (entry.break_minutes || 0) / 60);
    totalActualHours += hrs;

    const rate = rateByUser[entry.user_id] || 0;
    totalActualCost += hrs * rate;

    if (entry.cost_code_id) {
      hoursByCostCode[entry.cost_code_id] = (hoursByCostCode[entry.cost_code_id] || 0) + hrs;
    }

    const entryDate = new Date(entry.clock_out);
    if (!lastEntryDate || entryDate > lastEntryDate) lastEntryDate = entryDate;
  }

  // ── Budget totals ────────────────────────────────────────────────────────
  let totalBudgetHours = 0;
  let totalBudgetCost  = 0;
  let ccOver           = 0;
  let ccTotal          = 0;
  let varianceSum      = 0;

  for (const cc of costCodes) {
    const budget = parseFloat(cc.budgeted_hours) || 0;
    const actual = hoursByCostCode[cc.cost_code_id] || 0;
    totalBudgetHours += budget;
    totalBudgetCost  += parseFloat(cc.budgeted_labor_cost) || 0;
    if (budget > 0) {
      ccTotal++;
      if (actual > budget) ccOver++;
      varianceSum += (actual - budget) / budget;
    }
  }

  // ── Time-based features ──────────────────────────────────────────────────
  const now           = new Date();
  const startDate     = project.created_at ? new Date(project.created_at) : now;
  const daysElapsed   = Math.max(1, (now - startDate) / (1000 * 60 * 60 * 24));

  // Estimate project duration from budget hours (assuming ~8 workers × 8h/day)
  const estDurationDays = totalBudgetHours > 0 ? totalBudgetHours / (8 * 8) : 90;
  const estTotalDays    = Math.max(daysElapsed, estDurationDays);

  const daysSinceActivity = lastEntryDate
    ? Math.max(0, (now - lastEntryDate) / (1000 * 60 * 60 * 24))
    : daysElapsed;

  // ── Compute features ─────────────────────────────────────────────────────
  const pctBudgetConsumed  = totalBudgetHours > 0 ? totalActualHours / totalBudgetHours : 0;
  const expectedBurnRate   = totalBudgetHours / estTotalDays;     // hrs/day
  const actualBurnRate     = totalActualHours / daysElapsed;
  const burnRateRatio      = expectedBurnRate > 0 ? actualBurnRate / expectedBurnRate : 1;
  const pctCCOver          = ccTotal > 0 ? ccOver / ccTotal : 0;
  const pctTimeElapsed     = Math.min(daysElapsed / estTotalDays, 1.5);
  const avgVariance        = ccTotal > 0 ? varianceSum / ccTotal : 0;
  const schedulePressure   = pctTimeElapsed > 0.05 ? pctBudgetConsumed / pctTimeElapsed : burnRateRatio;
  const inactivityScore    = Math.min(daysSinceActivity / 30, 1); // normalize to 0-1 (30 days = max)

  const features = [
    pctBudgetConsumed,
    burnRateRatio,
    pctCCOver,
    pctTimeElapsed,
    avgVariance,
    Math.min(schedulePressure, 4),
    inactivityScore,
  ];

  const meta = {
    totalActualHours,
    totalBudgetHours,
    totalActualCost,
    totalBudgetCost,
    daysElapsed: Math.round(daysElapsed),
    estTotalDays: Math.round(estTotalDays),
    projectedFinalHours: actualBurnRate * estTotalDays,
    projectedFinalCost: totalBudgetHours > 0
      ? (totalActualCost / Math.max(totalActualHours, 1)) * (actualBurnRate * estTotalDays)
      : 0,
    costCodesAnalyzed: ccTotal,
    costCodesOverBudget: ccOver,
    lastActivityDaysAgo: Math.round(daysSinceActivity),
  };

  return { features, meta };
}

// ─── Prediction ───────────────────────────────────────────────────────────────

const RISK_LEVELS = [
  { max: 0.25, level: 'low',      label: 'On Track',      color: '#10b981' },
  { max: 0.50, level: 'moderate', label: 'Watch Closely', color: '#f59e0b' },
  { max: 0.75, level: 'high',     label: 'At Risk',       color: '#f97316' },
  { max: 1.00, level: 'critical', label: 'Over Budget',   color: '#ef4444' },
];

const FACTOR_LABELS = {
  pct_budget_hours_consumed:  'Budget hours consumed',
  burn_rate_ratio:            'Burn rate vs plan',
  pct_cost_codes_over_budget: 'Cost codes over budget',
  pct_time_elapsed:           'Project timeline progress',
  avg_hours_variance_pct:     'Average hours variance',
  schedule_pressure:          'Schedule pressure index',
  inactivity_score:           'Recent inactivity',
};

const FACTOR_DESCRIPTIONS = {
  pct_budget_hours_consumed:  'Hours already used as a share of the total budget.',
  burn_rate_ratio:            'You\'re spending hours faster than the schedule allows.',
  pct_cost_codes_over_budget: 'Share of cost codes that have exceeded their hour budget.',
  pct_time_elapsed:           'How far through the project timeline you are.',
  avg_hours_variance_pct:     'Average amount cost codes are running over their budgets.',
  schedule_pressure:          'Hours remaining vs. time left — low time, high hours left.',
  inactivity_score:           'No hours logged recently, which may signal delays.',
};

/**
 * Run prediction for a project.
 * @param {string} projectId
 * @param {string} companyId
 * @returns {object} Structured prediction result
 */
export async function predictBudget(projectId, companyId) {
  if (!_model) throw new Error('Model not initialized. Call initModel() first.');

  const { features, meta } = await extractFeatures(projectId, companyId);

  const normalized  = normalizeOne(features, _normMeans, _normStds);
  const probability = predict(normalized, _model);
  const riskInfo    = RISK_LEVELS.find(r => probability <= r.max) || RISK_LEVELS[RISK_LEVELS.length - 1];
  const score       = Math.round(probability * 100);

  // Top risk factors — positive contributions push toward over-budget
  const contributions = featureContributions(normalized, _model);
  const topFactors = contributions
    .filter(c => c.contribution > 0.05)
    .slice(0, 3)
    .map(c => ({
      factor:      FACTOR_LABELS[c.name] || c.name,
      description: FACTOR_DESCRIPTIONS[c.name] || '',
      impact:      c.contribution > 0.3 ? 'high' : c.contribution > 0.15 ? 'medium' : 'low',
      rawValue:    features[FEATURE_NAMES.indexOf(c.name)],
    }));

  return {
    score,
    probability,
    riskLevel: riskInfo.level,
    riskLabel: riskInfo.label,
    riskColor: riskInfo.color,
    topFactors,
    projection: {
      finalHours:    Math.round(meta.projectedFinalHours * 10) / 10,
      budgetedHours: Math.round(meta.totalBudgetHours * 10) / 10,
      finalCost:     Math.round(meta.projectedFinalCost),
      budgetedCost:  Math.round(meta.totalBudgetCost),
      hoursOverUnder: Math.round((meta.projectedFinalHours - meta.totalBudgetHours) * 10) / 10,
      costOverUnder:  Math.round(meta.projectedFinalCost - meta.totalBudgetCost),
    },
    meta: {
      actualHours:         Math.round(meta.totalActualHours * 10) / 10,
      budgetHours:         Math.round(meta.totalBudgetHours * 10) / 10,
      daysElapsed:         meta.daysElapsed,
      estTotalDays:        meta.estTotalDays,
      costCodesOverBudget: meta.costCodesOverBudget,
      costCodesTotal:      meta.costCodesAnalyzed,
      lastActivityDaysAgo: meta.lastActivityDaysAgo,
      modelAccuracy:       _accuracy ? Math.round(_accuracy * 1000) / 10 : null,
    },
  };
}
