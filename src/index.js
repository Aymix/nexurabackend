const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Import routes
const postRoutes = require('./routes/posts');
const schedulerRoutes = require('./routes/scheduler');
const settingsRoutes = require('./routes/settings');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aymenhmida1:kGJInUb8eD6meHBt@cluster0.ftir2.mongodb.net/nexuradb?retryWrites=true&w=majority&appName=Cluster0&tls=true";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/posts', postRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/settings', settingsRoutes);

// Set up cron job to process scheduled posts every minute
const schedulerUtil = require('./utils/schedulerUtil');
const cronInterval = setInterval(async () => {
  try {
    await schedulerUtil.processScheduledPosts();
  } catch (error) {
    console.error('Error in scheduled posts cron job:', error);
  }
}, 60000); // Run every 60 seconds

// Root route
app.get('/', (req, res) => {
  res.send('UiFormNexura API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
