import express from 'express';
import {
  getAllCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerProjectsSummary
} from '../controllers/customersController.js';

const router = express.Router();

// Search (must come before /:id route)
router.get('/search', searchCustomers);

// CRUD operations
router.get('/', getAllCustomers);
router.get('/:id', getCustomer);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

// Customer analytics
router.get('/:id/projects-summary', getCustomerProjectsSummary);

export default router;
