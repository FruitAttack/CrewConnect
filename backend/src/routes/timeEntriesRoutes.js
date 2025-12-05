import express from 'express';
import {
  clockIn,
  clockOut,
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
  getSecondsWorkedYear
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

// Geofencing
router.get('/nearby-projects', getNearbyProjects);
router.post('/validate-geofence', validateGeofence);

// CRUD operations
router.get('/', getTimeEntries);
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

export default router;