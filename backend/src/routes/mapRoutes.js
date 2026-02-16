/**
 * Map Routes - CrewConnect
 * Routes for map-related endpoints
 */

import express from 'express';
import { getMapOverview, getProjectMap } from '../controllers/mapController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/map/overview
 * Get all map data (projects, active employees, equipment)
 * Query params: company_id (required)
 */
router.get('/overview', getMapOverview);

/**
 * GET /api/map/project/:id
 * Get map data for a specific project
 * Query params: company_id (required)
 */
router.get('/project/:id', getProjectMap);

export default router;
