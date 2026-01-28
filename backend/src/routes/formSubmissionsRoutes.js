import express from 'express';
import {
  getAllFormSubmissions,
  getFormSubmission,
  createFormSubmission,
  updateFormSubmission,
  deleteFormSubmission,
  getFormSubmissionsByFormId,
  getFieldStatistics,
  seedFormSubmissions,
} from '../controllers/formSubmissionsController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// CRUD operations
router.get('/', getAllFormSubmissions);
router.get('/:id', getFormSubmission);
router.post('/', createFormSubmission);
router.put('/:id', updateFormSubmission);
router.delete('/:id', deleteFormSubmission);

// Form-specific submissions
router.get('/form/:formId', getFormSubmissionsByFormId);

// Analytics
router.get('/form/:formId/field-stats/:fieldId', getFieldStatistics);

// DEBUG/SEEDING (UNOFFICIAL)
router.post('/seed', seedFormSubmissions);
export default router;