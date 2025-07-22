import express from 'express';
import {
  createUserController,
  getUserController,
  getUserByEmailController,
  updateUserController,
  getAllUsersController,
  deleteUserController,
  searchUsersController
} from '../controllers/userController.js';

const router = express.Router();

// User CRUD operations
router.post('/', createUserController);                    // Create user
router.get('/', getAllUsersController);                    // Get all users
router.get('/search', searchUsersController);              // Search users
router.get('/email/:email', getUserByEmailController);     // Get user by email
router.get('/:userId', getUserController);                 // Get user by ID
router.put('/:userId', updateUserController);              // Update user
router.delete('/:userId', deleteUserController);           // Delete user

export default router;
