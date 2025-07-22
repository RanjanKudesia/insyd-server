import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['POST_LIKED', 'USER_FOLLOWED'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model('Notification', notificationSchema);
