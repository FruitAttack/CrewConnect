import express from 'express';
import {
  getAllForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  archiveForm,
  getFormStats,
  seedForms,
} from '../controllers/formsController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// CRUD operations
router.get('/', getAllForms);
router.get('/:id', getForm);
router.post('/', createForm);
router.put('/:id', updateForm);
router.delete('/:id', deleteForm);

// Form management
router.patch('/:id/archive', archiveForm);

// Form analytics
router.get('/:id/stats', getFormStats);

// DEBUG/SEEDING (UNOFFICIAL)
router.post('/seed', seedForms);
export default router;