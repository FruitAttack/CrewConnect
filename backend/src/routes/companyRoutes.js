import express from 'express';
import { createCompany, deleteCompany, signUpWithCompany } from '../controllers/companyController.js'
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Creates a new user account and a new company
router.post("/signup-with-company", signUpWithCompany)

router.use(authenticate);

// Create a new company
router.post('/', createCompany)

// Delete current user's company
router.delete('/', deleteCompany)

export default router;