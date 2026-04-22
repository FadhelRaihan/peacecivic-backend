import { Router } from 'express';
import { createTeam, joinTeam, deleteTeamManagement, removeMemberManagement } from '../controllers/team.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/create', createTeam);
router.post('/join', joinTeam);
router.delete('/:teamId', deleteTeamManagement);
router.delete('/:teamId/members/:userId', removeMemberManagement);

export default router;