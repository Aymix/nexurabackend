const Post = require('../models/Post');
const GenerationHistory = require('../models/GenerationHistory');
const geminiUtil = require('../utils/geminiUtil');

// Get all posts
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
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
    
    // Return the post (generations are already included via virtual populate)
    res.status(200).json(post);
  } catch (error) {
    console.error(`Error fetching post ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch post', details: error.message });
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    console.log('Received request to create post');
    const { topic, tone, wordCount, category } = req.body;
    
    console.log('Request body:', { topic, tone, wordCount, category });
    
    if (!topic) {
      console.log('Topic is required but was not provided');
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    // Generate content using Gemini
    console.log('Calling generateBlogPost with:', { topic, tone, wordCount });
    const generated = await geminiUtil.generateBlogPost(topic, tone, wordCount);
    
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
        category: category || 'Uncategorized'
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
    const { topic, tone, wordCount } = req.body;
    
    // Check if post exists
    const existingPost = await Post.findById(req.params.id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Use existing prompt if not provided
    const promptToUse = topic || existingPost.prompt || existingPost.title;
    
    // Generate new content
    const generated = await geminiUtil.generateBlogPost(
      promptToUse, 
      tone || 'informative', 
      wordCount || 800
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
