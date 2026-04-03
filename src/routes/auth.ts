import { Router, Response } from 'express';
import { AuthenticatedRequest, SignupPayload, LoginPayload } from '../types';
import { authMiddleware } from '../middleware/auth';
import * as authService from '../services/authService';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user account.
 */
router.post('/signup', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payload: SignupPayload = req.body;
    const result = await authService.signup(payload);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed.';
    const status = message.includes('already exists') ? 409 : 400;
    res.status(status).json({
      success: false,
      message,
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT.
 */
router.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payload: LoginPayload = req.body;
    const result = await authService.login(payload);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed.';
    res.status(401).json({
      success: false,
      message,
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication).
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved.',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
    });
  }
});

export default router;
