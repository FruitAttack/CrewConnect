import express from 'express';
import {
  getEquipmentUtilization,
  getUserTimecard,
  getDailyCrew,
  getCompanyDashboard,
  getAuditHistory,
  getWageHistory,
  getBudgetVsActual,
  getProductionReport,
  getLaborCostReport
} from '../controllers/reportsController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Budget vs Actual reports (NEW)
router.get('/budget-vs-actual', getBudgetVsActual);
router.get('/production', getProductionReport);
router.get('/labor-costs', getLaborCostReport);

// Equipment reports
router.get('/equipment-utilization', getEquipmentUtilization);

// User reports
router.get('/timecard', getUserTimecard);

// Company reports
router.get('/daily-crew', getDailyCrew);
router.get('/dashboard', getCompanyDashboard);

// Audit reports (Admin only)
router.get('/audit-history', getAuditHistory);
router.get('/wage-history', getWageHistory);

export default router;