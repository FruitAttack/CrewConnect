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
  getSecondsWorkedToday
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

// Geofencing
router.get('/nearby-projects', getNearbyProjects);
router.post('/validate-geofence', validateGeofence);

// CRUD operations
router.get('/', getTimeEntries);
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

export default router;