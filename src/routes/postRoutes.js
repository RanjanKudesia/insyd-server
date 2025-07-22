import express from 'express';
import {
  createPostController,
  getAllPostsController,
  getPostController,
  likePostController,
  unlikePostController,
  deletePostController
} from '../controllers/postController.js';

const router = express.Router();

// Get all posts
router.get('/', getAllPostsController);

// Create new post
router.post('/', createPostController);

// Get post by ID
router.get('/:postId', getPostController);

// Like a post (triggers EventBridge notification)
router.post('/:postId/like', likePostController);

// Unlike a post
router.delete('/:postId/like', unlikePostController); 
router.delete('/:postId', deletePostController); 

export default router;
