import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  // Clock in/out
  clockIn,
  clockOut,
  getCurrentTimeEntry,
  getTimeEntries,
  
  // Location/Geofence
  getNearbyProjects,
  validateGeofence,
  
  // CRUD operations
  updateTimeEntry,
  deleteTimeEntry,
  updateCostCode,
  updateNotes,
  
  // Time calculations
  getSecondsWorkedShift,
  getSecondsWorkedToday,
  getSecondsWorkedDay,
  getSecondsWorkedWeek,
  getSecondsWorkedMonth,
  getSecondsWorkedYear,
  
  // Breaks
  startBreak,
  endBreak,
  getCurrentBreak,
  
  // Roster/Management
  getActiveRoster,
  clockInForUser,
  clockOutForUser,
  switchTaskForUser,
  startBreakForUser,
  endBreakForUser,
  
  // Cron jobs (midnight split)
  processMidnightSplits,
  autoCloseStaleEntries,
  getCronStatus,
  fixOvernightEntries,
} from '../controllers/timeEntriesController.js';

const router = express.Router();

// ==========================================
// CRON JOB ROUTES (No auth - uses secret key)
// These must be BEFORE authMiddleware
// ==========================================
router.post('/cron/midnight-split', processMidnightSplits);
router.post('/cron/auto-close-stale', autoCloseStaleEntries);
router.post('/cron/fix-overnight', fixOvernightEntries);
router.get('/cron/status', getCronStatus);

// ==========================================
// PROTECTED ROUTES (Require authentication)
// ==========================================
router.use(authMiddleware);

// Clock in/out
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/current', getCurrentTimeEntry);

// Get time entries (with filters)
router.get('/', getTimeEntries);

// Location & Geofence
router.get('/nearby-projects', getNearbyProjects);
router.post('/validate-geofence', validateGeofence);

// CRUD operations
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);
router.put('/:id/cost-code', updateCostCode);
router.put('/:id/notes', updateNotes);

// Time calculations
router.get('/seconds-worked/shift', getSecondsWorkedShift);
router.get('/seconds-worked/today', getSecondsWorkedToday);
router.get('/seconds-worked/day', getSecondsWorkedDay);
router.get('/seconds-worked/week', getSecondsWorkedWeek);
router.get('/seconds-worked/month', getSecondsWorkedMonth);
router.get('/seconds-worked/year', getSecondsWorkedYear);

// Breaks
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);
router.get('/break/current', getCurrentBreak);

// Active roster for company (both routes for compatibility)
router.get('/roster/:company_id', getActiveRoster);
router.get('/manage/active', getActiveRoster);

// ==========================================
// MANAGER/ADMIN ROUTES
// Manage time entries for other users
// ==========================================
router.post('/manage/:user_id/clock-in', clockInForUser);
router.post('/manage/:user_id/clock-out', clockOutForUser);
router.post('/manage/:user_id/switch-task', switchTaskForUser);
router.post('/manage/:user_id/break/start', startBreakForUser);
router.post('/manage/:user_id/break/end', endBreakForUser);

export default router;