import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as statsController from '../controllers/statistics.controller';
// import * as settingsController from '../controllers/settings.controller';
import * as healthController from '../controllers/health.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { upload } from '../services/storage.service';

const router = Router();

router.use(authenticateToken);

// Reports & Statistics
router.get('/reports/overview', statsController.getOverviewStats);
router.get('/reports/activity', statsController.getActivityStats);
router.get('/reports/badges', statsController.getBadgeDistribution);
router.get('/reports/leaderboard', statsController.getLeaderboard);
router.get('/reports/classrooms', statsController.getClassroomStats);
router.get('/reports/missions', statsController.getMissionInsights);
router.get('/reports/detailed', statsController.getDetailedClassStats);

// router.get('/settings', settingsController.getSettings);
// router.patch('/settings', settingsController.updateSettings);
router.get('/health', healthController.getHealthStatus);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Relation Routes
router.post('/users/award-badge', adminController.awardBadge);
router.delete('/users/revoke-badge/:userBadgeId', adminController.revokeBadge);
router.delete('/users/remove-from-team/:teamMemberId', adminController.removeUserFromTeam);

// Module Management Routes
router.get('/modules', adminController.getModules);
router.post('/modules', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), adminController.createModule);
router.put('/modules/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), adminController.updateModule);
router.delete('/modules/:id', adminController.deleteModule);

// Mission Management Routes
router.get('/missions', adminController.getMissions);
router.post('/missions', adminController.createMission);
router.put('/missions/:id', adminController.updateMission);
router.delete('/missions/:id', adminController.deleteMission);

export default router;
