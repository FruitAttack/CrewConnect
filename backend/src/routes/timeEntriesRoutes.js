import express from 'express';
import {
  clockIn,
  clockOut,
  getActiveRoster,
  clockInForUser,
  clockOutForUser,
  switchTaskForUser,
  startBreakForUser,
  endBreakForUser,
  getCurrentTimeEntry,
  getTimeEntries,
  getNearbyProjects,
  validateGeofence,
  updateTimeEntry,
  deleteTimeEntry,
  getSecondsWorkedShift,
  getSecondsWorkedToday,
  getSecondsWorkedDay,
  getSecondsWorkedWeek,
  getSecondsWorkedMonth,
  getSecondsWorkedYear,
  startBreak,
  endBreak,
  getCurrentBreak,
  updateCostCode,
  updateNotes  // ADD THIS
} from '../controllers/timeEntriesController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all time entry routes
router.use(authenticate);

// Clock management
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/current', getCurrentTimeEntry);
router.get('/seconds-shift', getSecondsWorkedShift);
router.get('/seconds-today', getSecondsWorkedToday);
router.get('/seconds-day', getSecondsWorkedDay);
router.get('/seconds-week', getSecondsWorkedWeek);
router.get('/seconds-month', getSecondsWorkedMonth);
router.get('/seconds-year', getSecondsWorkedYear);

// Foreman/Admin live management
router.get('/manage/active', getActiveRoster);
router.post('/manage/:user_id/clock-in', clockInForUser);
router.post('/manage/:user_id/clock-out', clockOutForUser);
router.post('/manage/:user_id/switch-task', switchTaskForUser);
router.post('/manage/:user_id/break/start', startBreakForUser);
router.post('/manage/:user_id/break/end', endBreakForUser);

// Break management
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);
router.get('/break/current', getCurrentBreak);

// Cost code management - MUST BE BEFORE /:id routes!
router.put('/update-cost-code', updateCostCode);

// Geofencing
router.get('/nearby-projects', getNearbyProjects);
router.post('/validate-geofence', validateGeofence);

// CRUD operations - parameterized routes go LAST
router.get('/', getTimeEntries);
router.put('/:id', updateTimeEntry);
router.put('/:id/notes', updateNotes); 
router.delete('/:id', deleteTimeEntry);

export default router;