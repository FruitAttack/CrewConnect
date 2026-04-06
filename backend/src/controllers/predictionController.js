import { predictBudget } from '../ml/budgetPredictor.js';

/**
 * GET /api/projects/:id/budget-prediction
 *
 * Returns a budget over-run risk prediction for the given project.
 * Requires authentication (auth middleware applied in route).
 */
export async function getBudgetPrediction(req, res) {
  try {
    const { id: projectId } = req.params;
    const companyId = req.user?.default_company_id || req.query.company_id;

    if (!projectId) {
      return res.status(400).json({ message: 'project_id is required' });
    }

    if (!companyId) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    const result = await predictBudget(projectId, companyId);
    return res.status(200).json(result);

  } catch (err) {
    console.error('[BudgetPrediction] Error:', err.message);
    return res.status(500).json({ message: 'Failed to generate prediction', error: err.message });
  }
}
