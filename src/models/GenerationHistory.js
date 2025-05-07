const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GenerationHistorySchema = new Schema({
  prompt: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    index: true // Add index for better query performance
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Only track creation date
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add a virtual for the post relationship
GenerationHistorySchema.virtual('post', {
  ref: 'Post',
  localField: 'postId',
  foreignField: '_id',
  justOne: true // This is a single document relationship
});

module.exports = mongoose.model('GenerationHistory', GenerationHistorySchema);
