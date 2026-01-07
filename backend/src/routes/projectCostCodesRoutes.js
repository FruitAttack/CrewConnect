import express from 'express';
import {
  getProjectCostCodes,
  assignCostCodeToProject,
  removeCostCodeFromProject,
  updateProjectCostCodeBudget,
  getProjectBudgetSummary
} from '../controllers/projectCostCodesController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Budget summary for a project (must come before /:projectId/cost-codes)
router.get('/:projectId/budget-summary', getProjectBudgetSummary);

// Get cost codes for a project
router.get('/:projectId/cost-codes', getProjectCostCodes);

// Assign cost code to project (admin/supervisor)
router.post('/:projectId/cost-codes', assignCostCodeToProject);

// Update budget for a project cost code (admin/supervisor)
router.put('/:projectId/cost-codes/:costCodeId/budget', updateProjectCostCodeBudget);

// Remove cost code from project (admin/supervisor)
router.delete('/:projectId/cost-codes/:costCodeId', removeCostCodeFromProject);

export default router;