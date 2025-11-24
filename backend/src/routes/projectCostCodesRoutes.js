import express from 'express';
import {
  getProjectCostCodes,
  assignCostCodeToProject,
  removeCostCodeFromProject
} from '../controllers/projectCostCodesController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get cost codes for a project
router.get('/:projectId/cost-codes', getProjectCostCodes);

// Assign cost code to project (admin/supervisor)
router.post('/:projectId/cost-codes', assignCostCodeToProject);

// Remove cost code from project (admin/supervisor)
router.delete('/:projectId/cost-codes/:costCodeId', removeCostCodeFromProject);

export default router;