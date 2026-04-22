import { Router } from 'express';
import { 
    getDashboardStats, 
    getManagedTeams, 
    getManagedStudents,
    deleteStudent,
    awardSpecialBadge
} from '../controllers/teacher.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', getDashboardStats);
router.get('/teams-management', getManagedTeams);
router.get('/students-management', getManagedStudents);
router.delete('/students/:id', deleteStudent);
router.post('/students/:id/award-badge', awardSpecialBadge);

export default router;