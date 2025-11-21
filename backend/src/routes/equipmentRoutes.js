import express from 'express';
import {
  getAllEquipment,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  activateEquipment,
  getEquipmentTypes,
  getEquipmentUsage
} from '../controllers/equipmentController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Equipment types (must come before /:id route)
router.get('/types', getEquipmentTypes);

// CRUD operations
router.get('/', getAllEquipment);
router.get('/:id', getEquipment);
router.post('/', createEquipment);
router.put('/:id', updateEquipment);
router.delete('/:id', deleteEquipment);

// Equipment management
router.patch('/:id/activate', activateEquipment);
router.get('/:id/usage', getEquipmentUsage);

export default router;
