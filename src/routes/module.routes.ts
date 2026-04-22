import { Router } from "express";
import { getAllModules, getModuleBySlug, markModuleAsComplete } from "../controllers/module.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get('/', getAllModules);
router.get('/:slug', getModuleBySlug);
router.post('/:moduleId/complete', markModuleAsComplete);

export default router;