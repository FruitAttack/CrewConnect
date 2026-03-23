import express from 'express';
import { createCompany, deleteCompany } from '../controllers/companyController.js'
import { authenticate } from  '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Create a new company
router.post('/', createCompany)

// Delete curren't user's company
router.delete('/', deleteCompany)

export default router;