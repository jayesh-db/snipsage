import { Router, Response } from 'express';
import { AuthenticatedRequest, ChatRequestPayload, CreateSessionPayload } from '../types';
import { authMiddleware } from '../middleware/auth';
import * as chatSessionService from '../services/chatSessionService';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

/**
 * GET /api/chat/history
 * List all chat sessions for the authenticated user.
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const sessions = await chatSessionService.getUserSessions(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Chat history retrieved.',
      data: { sessions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history.',
    });
  }
});

/**
 * POST /api/chat/session
 * Create a new chat session.
 * Body: { title?: string, snippetId?: string }
 */
router.post('/session', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const payload: CreateSessionPayload = req.body;
    const session = await chatSessionService.createSession(
      req.user.userId,
      payload.title,
      payload.snippetId
    );

    res.status(201).json({
      success: true,
      message: 'Chat session created.',
      data: {
        sessionId: session._id.toString(),
        title: session.title,
        snippetId: session.snippetId?.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session.';
    res.status(400).json({ success: false, message });
  }
});

/**
 * GET /api/chat/session/:sessionId
 * Get full message history for a specific session.
 */
router.get('/session/:sessionId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const session = await chatSessionService.getSessionById(
      req.user.userId,
      req.params.sessionId as string
    );

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Session retrieved.',
      data: {
        sessionId: session._id.toString(),
        title: session.title,
        snippetId: session.snippetId?.toString(),
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session.',
    });
  }
});

/**
 * PUT /api/chat/session/:sessionId/message
 * Send a new user message, run RAG pipeline, append AI response, return it.
 * Body: { message: string }
 */
router.put('/session/:sessionId/message', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const payload: ChatRequestPayload = req.body;

    if (!payload.message || !payload.message.trim()) {
      res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
      return;
    }

    const result = await chatSessionService.addMessageAndRespond(
      req.user.userId,
      req.params.sessionId as string,
      payload.message
    );

    res.status(200).json({
      success: true,
      message: 'Response generated.',
      data: result,
    });
  } catch (error) {
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate response.';
    res.status(500).json({
      success: false,
      message,
    });
  }
});

/**
 * DELETE /api/chat/session/:sessionId
 * Delete a chat session.
 */
router.delete('/session/:sessionId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const deleted = await chatSessionService.deleteSession(
      req.user.userId,
      req.params.sessionId as string
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Session not found or you do not have permission to delete it.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Chat session deleted.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete session.',
    });
  }
});

export default router;
