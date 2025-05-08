const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  prompt: {
    type: String
  },
  category: {
    type: String,
    default: 'Uncategorized'
  },
  imageUrl: {
    type: String
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  posted_status: {
    type: Boolean,
    default: false
  },
  isPosted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // This will automatically manage createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtuals when calling toJSON()
  toObject: { virtuals: true } // Include virtuals when calling toObject()
});

// Virtual for generations - this doesn't actually store data in the database
// but allows us to use .populate('generations')
PostSchema.virtual('generations', {
  ref: 'GenerationHistory',
  localField: '_id',
  foreignField: 'postId'
});

module.exports = mongoose.model('Post', PostSchema);
