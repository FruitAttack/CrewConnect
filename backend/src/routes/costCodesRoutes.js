import express from 'express';
import {
  getAllCostCodes,
  getCostCode,
  createCostCode,
  updateCostCode,
  deleteCostCode,
  activateCostCode,
  searchCostCodes
} from '../controllers/costCodesController.js';

const router = express.Router();

// Search (must come before /:id route)
router.get('/search', searchCostCodes);

// CRUD operations
router.get('/', getAllCostCodes);
router.get('/:id', getCostCode);
router.post('/', createCostCode);
router.put('/:id', updateCostCode);
router.delete('/:id', deleteCostCode);

// Activation
router.patch('/:id/activate', activateCostCode);

export default router;