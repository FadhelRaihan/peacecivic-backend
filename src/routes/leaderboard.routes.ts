import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getLeaderboard);

export default router;
