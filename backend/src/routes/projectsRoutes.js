import express from 'express';
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  activateProject,
  getProjectLaborSummary,
  getProjectCostBreakdown
} from '../controllers/projectsController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// CRUD operations
router.get('/', getAllProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Activation
router.patch('/:id/activate', activateProject);

// Project analytics
router.get('/:id/labor-summary', getProjectLaborSummary);
router.get('/:id/cost-breakdown', getProjectCostBreakdown);

export default router;