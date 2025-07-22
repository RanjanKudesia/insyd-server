import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    unique: true
  },
  authorId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  likes: [String],      // Array of userIds who liked
  likeCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

export default mongoose.model('Post', postSchema);
