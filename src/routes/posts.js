const express = require('express');
const postController = require('../controllers/postController');

const router = express.Router();

// GET /api/posts - Retrieve all posts
router.get('/', postController.getAllPosts);

// POST /api/posts - Create a new post
router.post('/', postController.createPost);

// GET /api/posts/analytics - Get analytics data
// Important: This specific route must come before /:id routes
router.get('/analytics', postController.getAnalytics);

// GET /api/posts/:id - Get a specific post
router.get('/:id', postController.getPostById);

// PUT /api/posts/:id - Update a specific post
router.put('/:id', postController.updatePost);

// DELETE /api/posts/:id - Delete a specific post
router.delete('/:id', postController.deletePost);

// POST /api/posts/:id/regenerate - Regenerate content for a specific post
router.post('/:id/regenerate', postController.regenerateContent);

// POST /api/posts/:id/tweet - Post tweet for a specific post
router.post('/:id/tweet', postController.postTweet);

module.exports = router;
