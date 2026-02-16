import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  // Employee endpoints
  getTimeOffRequests,
  createTimeOffRequest,
  cancelTimeOffRequest,
  getTimeOffBalances,
  
  // Manager endpoints (web only)
  getPendingRequests,
  getAllRequests,
  approveRequest,
  denyRequest,
} from '../controllers/timeOffController.js';

const router = express.Router();

// ==========================================
// PROTECTED ROUTES (Require authentication)
// ==========================================
router.use(authMiddleware);

// ==========================================
// SPECIFIC ROUTES MUST COME BEFORE /:id
// ==========================================

// Get current user's PTO balances
router.get('/balances', getTimeOffBalances);

// Get all pending requests for approval (managers)
router.get('/pending', getPendingRequests);

// Get all requests with filters (managers)
router.get('/all', getAllRequests);

// ==========================================
// EMPLOYEE ROUTES (Mobile + Web)
// ==========================================

// Get current user's time-off requests
router.get('/', getTimeOffRequests);

// Submit a new time-off request
router.post('/', createTimeOffRequest);

// ==========================================
// PARAMETERIZED ROUTES MUST COME LAST
// ==========================================

// Cancel a pending request
router.delete('/:id', cancelTimeOffRequest);

// Approve a request
router.patch('/:id/approve', approveRequest);

// Deny a request
router.patch('/:id/deny', denyRequest);

export default router;