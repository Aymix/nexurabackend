const Post = require('../models/Post');
const GenerationHistory = require('../models/GenerationHistory');
const geminiUtil = require('../utils/geminiUtil');
const twitterUtil = require('../utils/twitterUtil');

// Get all posts with pagination and filters
exports.getAllPosts = async (req, res) => {
  try {
    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Extract filter parameters from query
    const { search, category, dateRange } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Add search filter for title or content if provided
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } }, // Case-insensitive search in title
        { content: { $regex: search, $options: 'i' } } // Case-insensitive search in content
      ];
    }
    
    // Add category filter if provided
    if (category) {
      filter.category = category;
    }
    
    // Add date range filter if provided
    if (dateRange) {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          // Start of the current week (Sunday)
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          // Start of the current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }
    
    // Log query parameters
    console.log('Fetching posts with filters:', { 
      page, 
      limit, 
      skip, 
      search: search || 'none', 
      category: category || 'all',
      dateRange: dateRange || 'all',
      filter
    });
    
    // Get total count of filtered posts for pagination info
    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit) || 1; // Ensure at least 1 page
    
    // Fetch posts with filters and pagination
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Process each post for backward compatibility
    const processedPosts = posts.map(post => {
      const postData = post.toObject();
      if (postData.isPosted !== undefined && postData.posted_status === undefined) {
        postData.posted_status = postData.isPosted;
      }
      return postData;
    });
    
    // Return paginated and filtered response with processed posts
    res.status(200).json({
      posts: processedPosts,
      totalPosts,
      totalPages,
      currentPage: page,
      postsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Get single post by ID
exports.getPostById = async (req, res) => {
  try {
    console.log(`Attempting to find post with ID: ${req.params.id}`);
    
    // Check if the ID is in valid format for MongoDB
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error(`Invalid MongoDB ID format: ${req.params.id}`);
      return res.status(400).json({ error: 'Invalid post ID format' });
    }
    
    // Find the post and populate generations
    const post = await Post.findById(req.params.id).populate('generations');
    
    if (!post) {
      console.log(`No post found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log(`Found post: ${post.title} with ID: ${post._id}`);
    
    // Ensure backward compatibility with posts that might have isPosted instead of posted_status
    const postData = post.toObject();
    if (postData.isPosted !== undefined && postData.posted_status === undefined) {
      postData.posted_status = postData.isPosted;
    }
    
    // Return the post with normalized data (generations are already included via virtual populate)
    res.status(200).json(postData);
  } catch (error) {
    console.error(`Error fetching post ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch post', details: error.message });
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    console.log('Received request to create post');
    const { topic, tone, wordCount, category, platform, scheduledDate } = req.body;
    
    console.log('Request body:', { topic, tone, wordCount, category, platform, scheduledDate });
    
    if (!topic) {
      console.log('Topic is required but was not provided');
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    // Generate content using Gemini with platform-specific prompts
    console.log('Calling generateBlogPost with:', { topic, tone, wordCount, platform });
    const generated = await geminiUtil.generateBlogPost(topic, tone, wordCount, platform || category || 'blog');
    
    if (!generated.success) {
      console.error('Error from Gemini API:', generated.error);
      return res.status(500).json({ 
        error: generated.error || 'Failed to generate content',
        details: generated.details || 'No additional details available'
      });
    }
    
    console.log('Successfully generated content with title:', generated.title);
    
    try {
      // Create the post
      const post = new Post({
        title: generated.title,
        content: generated.content,
        prompt: topic,
        category: category || 'Uncategorized',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        isScheduled: !!scheduledDate
      });
      
      // Save the post
      const savedPost = await post.save();
      
      // Create generation history
      const generationHistory = new GenerationHistory({
        prompt: topic,
        response: generated.rawResponse || '',
        postId: savedPost._id
      });
      
      // Save generation history
      await generationHistory.save();
      
      console.log('Post saved successfully with ID:', savedPost._id);
      
      // Auto post to Twitter if enabled in the request
      if (req.body.postToTwitter) {
        try {
          // Create a tweet with the title and a generated short URL
          const tweetContent = `${savedPost.title} #Nexura`;
          console.log('Posting to Twitter:', tweetContent);
          
          const tweetResult = await twitterUtil.postTweet(tweetContent);
          
          if (tweetResult.success) {
            console.log('Successfully posted to Twitter:', tweetResult.data);
          } else {
            console.error('Failed to post to Twitter:', tweetResult.error);
          }
        } catch (twitterError) {
          console.error('Error posting to Twitter:', twitterError);
          // Continue with the response even if Twitter posting fails
        }
      }
      return res.status(201).json(savedPost);
    } catch (dbError) {
      console.error('Database error when saving post:', dbError);
      return res.status(500).json({
        error: 'Failed to save post to database',
        details: String(dbError)
      });
    }
  } catch (error) {
    console.error('Unhandled error in createPost:', error);
    res.status(500).json({
      error: 'Failed to create post',
      details: String(error)
    });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    // Check if post exists
    const existingPost = await Post.findById(req.params.id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        category,
        updatedAt: Date.now()
      },
      { new: true } // Return the updated document
    );
    
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error(`Error updating post ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    // Check if post exists
    const existingPost = await Post.findById(req.params.id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Delete all associated generation histories
    await GenerationHistory.deleteMany({ postId: req.params.id });
    
    // Delete the post
    await Post.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(`Error deleting post ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// Regenerate content for a post
exports.regenerateContent = async (req, res) => {
  try {
    const { topic, tone, wordCount, platform } = req.body;
    
    // Check if post exists
    const existingPost = await Post.findById(req.params.id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Use existing prompt if not provided
    const promptToUse = topic || existingPost.prompt || existingPost.title;
    
    // Generate new content with platform-specific prompts
    const generated = await geminiUtil.generateBlogPost(
      promptToUse, 
      tone || 'informative', 
      wordCount || 800,
      platform || existingPost.category || 'blog'
    );
    
    if (!generated.success) {
      return res.status(500).json({
        error: generated.error || 'Failed to regenerate content'
      });
    }
    
    // Update the post with new content
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title: generated.title,
        content: generated.content,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    // Create new generation history
    const generationHistory = new GenerationHistory({
      prompt: promptToUse,
      response: generated.rawResponse || '',
      postId: req.params.id
    });
    
    // Save generation history
    await generationHistory.save();
    
    // Find all generations for this post
    const generations = await GenerationHistory.find({ postId: req.params.id });
    
    res.status(200).json({
      ...updatedPost.toJSON(),
      generations
    });
  } catch (error) {
    console.error(`Error regenerating content for post ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to regenerate content' });
  }
};

// Post a tweet for a specific post
exports.postTweet = async (req, res) => {
  try {
    // Find the post
    const post = await Post.findById(req.params.id);
    console.log('Original post found:', post);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Get custom tweet content or use post title
    const tweetContent = req.body.content || `${post.title} #Nexura`;
    
    // Post to Twitter
    console.log('Posting to Twitter:', tweetContent);
    const tweetResult = await twitterUtil.postTweet(tweetContent);
    
    if (tweetResult.success) {
      console.log('Tweet successful, updating post status with multiple methods for reliability...');
      
      try {
        // Method 1: First try direct update on the post object
        post.isPosted = true;
        post.posted_status = true;
        await post.save();
        console.log('Method 1 complete - Direct update and save');
        
        // Method 2: Also try findByIdAndUpdate for redundancy
        const updatedPost = await Post.findByIdAndUpdate(
          req.params.id,
          { 
            $set: { 
              isPosted: true, 
              posted_status: true 
            } 
          },
          { new: true } // Return the updated document
        );
        
        if (!updatedPost) {
          console.error('Post not found during update with Method 2');
          // Continue anyway since Method 1 might have worked
        } else {
          console.log('Method 2 complete - findByIdAndUpdate');
        }
        
        // Method 3: Direct updateOne as final fallback
        await Post.updateOne(
          { _id: req.params.id },
          { $set: { isPosted: true, posted_status: true } }
        );
        console.log('Method 3 complete - updateOne');
        
        // Verify the update by fetching the post again
        const verifiedPost = await Post.findById(req.params.id);
        console.log('POST-UPDATE VERIFICATION:', verifiedPost);
        console.log('Verified updated fields - isPosted:', verifiedPost.isPosted, 'posted_status:', verifiedPost.posted_status);
        
        // Return success response with verified post data
        res.status(200).json({
          message: 'Tweet posted successfully',
          tweetData: tweetResult.data,
          post: {
            _id: verifiedPost._id,
            isPosted: verifiedPost.isPosted,
            posted_status: verifiedPost.posted_status
          }
        });
      } catch (updateError) {
        console.error('Error updating post status:', updateError);
        res.status(500).json({
          error: 'Failed to update post status',
          details: updateError.message
        });
      }
    } else {
      res.status(500).json({
        error: 'Failed to post tweet',
        details: tweetResult.error
      });
    }
  } catch (error) {
    console.error(`Error posting tweet for post ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to post tweet', details: error.message });
  }
};

// Get analytics data for posts by platform
exports.getAnalytics = async (req, res) => {
  try {
    // Current date and time
    const now = new Date();
    
    // Date ranges - using native Date methods
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    
    // Generate dates for last 6 days for daily chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push(date);
    }
    
    // Get day labels for the chart
    const dayLabels = last7Days.map(date => {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
    
    // Get counts for Twitter posts
    const twitterPostsCurrentWeek = await Post.countDocuments({
      category: 'twitter',
      createdAt: { $gte: oneWeekAgo }
    });
    
    const twitterPostsPreviousWeek = await Post.countDocuments({
      category: 'twitter',
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });
    
    const twitterPostsCurrentMonth = await Post.countDocuments({
      category: 'twitter',
      createdAt: { $gte: oneMonthAgo }
    });
    
    const twitterPostsPreviousMonth = await Post.countDocuments({
      category: 'twitter',
      createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo }
    });
    
    // Get counts for Facebook posts
    const facebookPostsCurrentWeek = await Post.countDocuments({
      category: 'facebook',
      createdAt: { $gte: oneWeekAgo }
    });
    
    const facebookPostsPreviousWeek = await Post.countDocuments({
      category: 'facebook',
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });
    
    const facebookPostsCurrentMonth = await Post.countDocuments({
      category: 'facebook',
      createdAt: { $gte: oneMonthAgo }
    });
    
    const facebookPostsPreviousMonth = await Post.countDocuments({
      category: 'facebook',
      createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo }
    });
    
    // Calculate percentage changes
    const twitterWeeklyChange = twitterPostsPreviousWeek === 0 
      ? 100 // If previous was 0, any new posts are 100% increase
      : Math.round(((twitterPostsCurrentWeek - twitterPostsPreviousWeek) / twitterPostsPreviousWeek) * 100);
      
    const twitterMonthlyChange = twitterPostsPreviousMonth === 0 
      ? 100 
      : Math.round(((twitterPostsCurrentMonth - twitterPostsPreviousMonth) / twitterPostsPreviousMonth) * 100);
      
    const facebookWeeklyChange = facebookPostsPreviousWeek === 0 
      ? 100 
      : Math.round(((facebookPostsCurrentWeek - facebookPostsPreviousWeek) / facebookPostsPreviousWeek) * 100);
      
    const facebookMonthlyChange = facebookPostsPreviousMonth === 0 
      ? 100 
      : Math.round(((facebookPostsCurrentMonth - facebookPostsPreviousMonth) / facebookPostsPreviousMonth) * 100);
    
    // Get daily data for charts
    const twitterDailyData = [];
    const facebookDailyData = [];
    
    // Get posts count for each day in the last 7 days
    for (let i = 0; i < last7Days.length; i++) {
      const startOfDay = new Date(last7Days[i]);
      const endOfDay = new Date(last7Days[i]);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Twitter posts for this day
      const twitterCount = await Post.countDocuments({
        category: 'twitter',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      twitterDailyData.push(twitterCount);
      
      // Facebook posts for this day
      const facebookCount = await Post.countDocuments({
        category: 'facebook',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      facebookDailyData.push(facebookCount);
    }
    
    // Get total posts by platform (for pie chart)
    const twitterTotal = await Post.countDocuments({ category: 'twitter' });
    const facebookTotal = await Post.countDocuments({ category: 'facebook' });
    
    // Prepare response
    const analytics = {
      twitter: {
        weekly: {
          count: twitterPostsCurrentWeek,
          previousCount: twitterPostsPreviousWeek,
          percentChange: twitterWeeklyChange
        },
        monthly: {
          count: twitterPostsCurrentMonth,
          previousCount: twitterPostsPreviousMonth,
          percentChange: twitterMonthlyChange
        },
        daily: twitterDailyData
      },
      facebook: {
        weekly: {
          count: facebookPostsCurrentWeek,
          previousCount: facebookPostsPreviousWeek,
          percentChange: facebookWeeklyChange
        },
        monthly: {
          count: facebookPostsCurrentMonth,
          previousCount: facebookPostsPreviousMonth,
          percentChange: facebookMonthlyChange
        },
        daily: facebookDailyData
      },
      totals: {
        twitter: twitterTotal,
        facebook: facebookTotal
      },
      chartLabels: {
        days: dayLabels
      }
    };
    
    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data', details: error.message });
  }
};
