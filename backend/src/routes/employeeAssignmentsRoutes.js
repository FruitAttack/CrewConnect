import express from 'express';
import {
  assignEmployee,
  unassignEmployee,
  getForemanCrew,
  getEmployeeForeman,
  getAllAssignments,
  bulkAssignEmployees,
  reassignEmployee
} from '../controllers/employeeAssignmentsController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Bulk operations (must come before single routes)
router.post('/bulk', bulkAssignEmployees);
router.put('/reassign', reassignEmployee);

// Query by foreman or employee
router.get('/foreman/:foreman_id', getForemanCrew);
router.get('/employee/:employee_id', getEmployeeForeman);

// CRUD operations
router.get('/', getAllAssignments);
router.post('/', assignEmployee);
router.delete('/:foreman_id/:employee_id', unassignEmployee);

export default router;