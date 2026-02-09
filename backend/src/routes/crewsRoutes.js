import express from 'express';
import {
  getAllCrews,
  getCrew,
  createCrew,
  updateCrew,
  deleteCrew,
  activateCrew,
  addCrewMember,
  removeCrewMember,
  getUserCrews
} from '../controllers/crewsController.js';

import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Lookup by user (must come before /:id)
router.get('/user/:user_id', getUserCrews);

// CRUD operations
router.get('/', getAllCrews);
router.get('/:id', getCrew);
router.post('/', createCrew);
router.put('/:id', updateCrew);
router.delete('/:id', deleteCrew);

// Activation
router.patch('/:id/activate', activateCrew);

// Member management
router.post('/:id/members', addCrewMember);
router.delete('/:id/members/:user_id', removeCrewMember);

export default router;
