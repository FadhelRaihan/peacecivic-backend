import { Router } from 'express';
import { getProfile, getLeaderboard, updateAvatar } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { upload } from '../services/storage.service';

const router = Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.get('/leaderboard', getLeaderboard);
router.put('/avatar', upload.single('avatar'), updateAvatar);

export default router;