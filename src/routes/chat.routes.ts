import { Router } from 'express';
import { getForumHistory, getTeamChatHistory } from '../controllers/chat.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/forum', getForumHistory);
router.get('/team/:teamId', getTeamChatHistory);

export default router;