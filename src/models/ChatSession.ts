import mongoose, { Schema } from 'mongoose';
import { IChatSession } from '../types';

const ChatSessionMessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    sources: {
      type: [
        {
          pageTitle: { type: String, required: true },
          sourceUrl: { type: String, required: true },
          snippet: { type: String, required: true },
        },
      ],
      default: undefined,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title must be less than 200 characters'],
    },
    messages: {
      type: [ChatSessionMessageSchema],
      default: [],
    },
    snippetId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Index for listing user sessions sorted by recent
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);

export default ChatSession;
