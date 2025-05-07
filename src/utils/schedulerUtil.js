const Post = require('../models/Post');
const twitterUtil = require('./twitterUtil');

/**
 * Utility for handling scheduled posts
 */
const schedulerUtil = {
  /**
   * Process scheduled posts that are due to be published
   * This should be called by a cron job or scheduler at regular intervals
   */
  processScheduledPosts: async () => {
    try {
      console.log('Processing scheduled posts...');
      
      // Get current time
      const now = new Date();
      
      // Find posts that are scheduled and due to be published
      const duePosts = await Post.find({
        isScheduled: true,
        isPosted: false,
        scheduledDate: { $lte: now } // Less than or equal to current time
      });
      
      console.log(`Found ${duePosts.length} scheduled posts to process`);
      
      // Process each post
      for (const post of duePosts) {
        try {
          // If post is for Twitter, post to Twitter
          if (post.category.toLowerCase() === 'twitter') {
            console.log(`Posting scheduled tweet for post: ${post._id}`);
            
            try {
              // Create a tweet with the title
              const tweetContent = `${post.title} #Nexura`;
              const tweetResult = await twitterUtil.postTweet(tweetContent);
              
              if (tweetResult.success) {
                console.log('Successfully posted scheduled tweet:', tweetResult.data);
              } else {
                console.error('Failed to post scheduled tweet:', tweetResult.error);
              }
            } catch (twitterError) {
              console.error('Error posting scheduled tweet:', twitterError);
            }
          }
          
          // Mark as posted regardless of the outcome to prevent re-processing
          post.isPosted = true;
          await post.save();
          console.log(`Marked post ${post._id} as posted`);
          
        } catch (postError) {
          console.error(`Error processing scheduled post ${post._id}:`, postError);
        }
      }
      
      return {
        success: true,
        processedCount: duePosts.length
      };
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get all scheduled posts
   */
  getScheduledPosts: async () => {
    try {
      const scheduledPosts = await Post.find({
        isScheduled: true,
        isPosted: false
      }).sort({ scheduledDate: 1 });
      
      return {
        success: true,
        posts: scheduledPosts
      };
    } catch (error) {
      console.error('Error getting scheduled posts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = schedulerUtil;
