import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  offlineClockIn,
  offlineClockOut,
  offlineStartBreak,
  offlineEndBreak,
} from '../controllers/offlineTimeEntriesController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/clock-in', offlineClockIn);
router.post('/clock-out', offlineClockOut);
router.post('/break/start', offlineStartBreak);
router.post('/break/end', offlineEndBreak);

export default router;