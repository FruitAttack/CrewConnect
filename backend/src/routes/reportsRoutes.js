import express from 'express';
import {
  getEquipmentUtilization,
  getUserTimecard,
  getDailyCrew,
  getCompanyDashboard,
  getAuditHistory,
  getWageHistory
} from '../controllers/reportsController.js';

const router = express.Router();

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