import { Router } from "express";
import { register, login, getAvailableClasses } from "../controllers/auth.controller";

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/classes', getAvailableClasses);

export default router;