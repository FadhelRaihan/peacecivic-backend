import { Router } from "express";
import {
    submitProjectPlan,
    approveProjectPlan,
    submitProjectReport,
    finalizeProject,
    getAllProjects,
    getMyTeamProjects
} from '../controllers/project.controller';
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload } from "../services/storage.service";

const router = Router();

router.use(authenticateToken);

// Route Siswa
router.get('/my-team', getMyTeamProjects);
router.post('/submit-plan', upload.single('plan_file'), submitProjectPlan);
router.post('/:projectId/submit-report', upload.array('report_files', 5), submitProjectReport);

// Route Guru
router.get('/all', getAllProjects);
router.post('/:projectId/approve-plan', approveProjectPlan);
router.post('/:projectId/finalize', finalizeProject);

export default router;