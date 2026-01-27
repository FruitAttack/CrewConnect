import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getTimecardApprovals,
  upsertTimecardApproval,
  bulkUpdateApprovals,
  deleteTimecardApproval,
} from '../controllers/timecardApprovalsController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/timecard-approvals?company_id=xxx&week_start=2025-01-19
router.get('/', getTimecardApprovals);

// POST /api/timecard-approvals (single approval)
router.post('/', upsertTimecardApproval);

// POST /api/timecard-approvals/bulk (bulk approval)
router.post('/bulk', bulkUpdateApprovals);

// DELETE /api/timecard-approvals/:id
router.delete('/:id', deleteTimecardApproval);

export default router;
