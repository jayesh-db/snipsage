import { Router, Response } from 'express';
import { AuthenticatedRequest, ContentCapturePayload, ContentListQuery } from '../types';
import { authMiddleware } from '../middleware/auth';
import * as contentService from '../services/contentService';

const router = Router();

// All content routes require authentication
router.use(authMiddleware);

/**
 * POST /api/content
 * Save new captured content from the Chrome extension or dashboard.
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const payload: ContentCapturePayload = req.body;

    // Validate captureType if provided
    if (payload.captureType && !['selection', 'full-page'].includes(payload.captureType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid captureType. Must be "selection" or "full-page".',
      });
      return;
    }

    const content = await contentService.saveContent(req.user.userId, payload);

    res.status(201).json({
      success: true,
      message: 'Content saved successfully.',
      data: { content },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save content.';
    res.status(400).json({
      success: false,
      message,
    });
  }
});

/**
 * GET /api/content
 * List user's saved content with pagination and search.
 * Query params: page, limit, search
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const query: ContentListQuery = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
    };

    const result = await contentService.getUserContent(req.user.userId, query);

    res.status(200).json({
      success: true,
      message: 'Content retrieved successfully.',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve content.',
    });
  }
});

/**
 * GET /api/content/:id
 * Get a single content item by ID.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const content = await contentService.getContentById(req.user.userId, req.params.id as string);
    if (!content) {
      res.status(404).json({ success: false, message: 'Content not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Content retrieved.',
      data: { content },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve content.',
    });
  }
});

/**
 * DELETE /api/content/:id
 * Delete a content item (ownership verified server-side).
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const deleted = await contentService.deleteContent(req.user.userId, req.params.id as string);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Content not found or you do not have permission to delete it.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete content.',
    });
  }
});

export default router;
