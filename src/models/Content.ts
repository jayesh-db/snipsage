import mongoose, { Schema } from 'mongoose';
import { IContent } from '../types';

const ContentSchema = new Schema<IContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Content text is required'],
      trim: true,
      maxlength: [100000, 'Content must be less than 100000 characters'],
    },
    sourceUrl: {
      type: String,
      required: [true, 'Source URL is required'],
      trim: true,
    },
    pageTitle: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
    embedding: {
      type: [Number],
      default: [],
      select: false, // Don't include embeddings in normal queries
    },
    captureType: {
      type: String,
      enum: ['selection', 'full-page'],
      default: 'selection',
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      default: undefined,
      index: true,
    },
    chunkIndex: {
      type: Number,
      default: undefined,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for efficient user-scoped queries
ContentSchema.index({ userId: 1, savedAt: -1 });

// Text index for search functionality
ContentSchema.index({ text: 'text', pageTitle: 'text', sourceUrl: 'text' });

// Index for finding chunks by parent
ContentSchema.index({ parentId: 1, chunkIndex: 1 });

const Content = mongoose.model<IContent>('Content', ContentSchema);

export default Content;
