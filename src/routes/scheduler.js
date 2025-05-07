const express = require('express');
const router = express.Router();
const schedulerUtil = require('../utils/schedulerUtil');

// Route to manually trigger scheduled posts processing
router.post('/process', async (req, res) => {
  try {
    const result = await schedulerUtil.processScheduledPosts();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    res.status(500).json({ error: 'Failed to process scheduled posts' });
  }
});

// Route to get all scheduled posts
router.get('/posts', async (req, res) => {
  try {
    const result = await schedulerUtil.getScheduledPosts();
    if (result.success) {
      res.status(200).json(result.posts);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting scheduled posts:', error);
    res.status(500).json({ error: 'Failed to get scheduled posts' });
  }
});

module.exports = router;
