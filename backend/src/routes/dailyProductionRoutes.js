import express from 'express';
import {
  getAllDailyProduction,
  getDailyProduction,
  createDailyProduction,
  updateDailyProduction,
  deleteDailyProduction,
  getDailyProductionByProject,
  getDailyProductionByDate,
  getDailyProductionSummary,
  approveDailyProduction
} from '../controllers/dailyProductionController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Summary/analytics (must come before /:id routes)
router.get('/summary', getDailyProductionSummary);
router.get('/by-date', getDailyProductionByDate);
router.get('/project/:projectId', getDailyProductionByProject);

// CRUD operations
router.get('/', getAllDailyProduction);
router.get('/:id', getDailyProduction);
router.post('/', createDailyProduction);
router.put('/:id', updateDailyProduction);
router.delete('/:id', deleteDailyProduction);

// Approval workflow
router.patch('/:id/approve', approveDailyProduction);

export default router;
