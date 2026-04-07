import express from 'express';
import { getBudgetPrediction } from '../controllers/predictionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects/:id/budget-prediction
router.get('/:id/budget-prediction', authenticate, getBudgetPrediction);

export default router;
