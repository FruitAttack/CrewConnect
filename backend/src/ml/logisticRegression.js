/**
 * Logistic Regression — pure JS implementation, no external dependencies.
 *
 * Binary classifier: predicts P(over_budget | features)
 * Uses batch gradient descent with L2 regularization.
 */

function sigmoid(z) {
  // Clamp to avoid overflow in exp
  const clamped = Math.max(-500, Math.min(500, z));
  return 1 / (1 + Math.exp(-clamped));
}

/**
 * Train a logistic regression model.
 * @param {number[][]} X  - Feature matrix (n_samples × n_features), already normalized
 * @param {number[]}   y  - Labels (0 or 1), length n_samples
 * @param {object}     opts
 * @returns {{ weights: number[], bias: number, featureNames: string[] }}
 */
export function train(X, y, opts = {}) {
  const {
    learningRate = 0.05,
    epochs      = 2000,
    lambda      = 0.01,   // L2 regularization strength
    featureNames = [],
  } = opts;

  const nSamples  = X.length;
  const nFeatures = X[0].length;

  let weights = new Array(nFeatures).fill(0);
  let bias    = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const dw = new Array(nFeatures).fill(0);
    let db = 0;

    for (let i = 0; i < nSamples; i++) {
      const z    = X[i].reduce((sum, xi, j) => sum + xi * weights[j], bias);
      const pred = sigmoid(z);
      const err  = pred - y[i];

      for (let j = 0; j < nFeatures; j++) {
        dw[j] += err * X[i][j];
      }
      db += err;
    }

    // Gradient descent with L2 regularization
    weights = weights.map((w, j) =>
      w - learningRate * (dw[j] / nSamples + lambda * w)
    );
    bias -= learningRate * (db / nSamples);
  }

  return { weights, bias, featureNames };
}

/**
 * Predict probability of over-budget for a single sample.
 * @param {number[]} x       - Feature vector (must match training order)
 * @param {object}   model   - { weights, bias }
 * @returns {number}          - Probability in [0, 1]
 */
export function predict(x, model) {
  const { weights, bias } = model;
  const z = x.reduce((sum, xi, j) => sum + xi * weights[j], bias);
  return sigmoid(z);
}

/**
 * Compute feature importances — how much each feature pushes the prediction.
 * Returns signed contributions (positive = pushes toward over-budget).
 * @param {number[]} x
 * @param {object}   model
 * @returns {{ name: string, contribution: number }[]}
 */
export function featureContributions(x, model) {
  const { weights, bias, featureNames } = model;
  return weights.map((w, j) => ({
    name: featureNames[j] || `f${j}`,
    contribution: w * x[j],   // signed contribution to the logit
    value: x[j],
    weight: w,
  })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/**
 * Evaluate accuracy on a test set.
 */
export function evaluate(X, y, model, threshold = 0.5) {
  let correct = 0;
  for (let i = 0; i < X.length; i++) {
    const p = predict(X[i], model);
    if ((p >= threshold ? 1 : 0) === y[i]) correct++;
  }
  return correct / X.length;
}
