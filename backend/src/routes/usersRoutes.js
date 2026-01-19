import express from "express";
import {
  createUser,
  getAllUsers,
  getUser,
  getMe,
  updateUser,
  deleteUser,
  activateUser,
  assignUserToCompany,
  updateUserEmployment,
  searchUsers
} from "../controllers/usersController.js";
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Current user profile (must come before /:id route)
router.get("/me", getMe);

// Search (must come before /:id route)
router.get("/search", searchUsers);

// CRUD operations
router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// User management
router.patch("/:id/activate", activateUser);
router.post("/:id/assign-company", assignUserToCompany);
router.post("/:id/employment", updateUserEmployment);

export default router;