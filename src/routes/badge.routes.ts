import { Router } from "express";
import { createBadge, getAllBadges, deleteBadge } from "../controllers/badge.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload } from "../services/storage.service";

const router = Router();

router.use(authenticateToken);

router.get("/", getAllBadges);
router.post("/", upload.single("badge_icon"), createBadge);
router.delete("/:id", deleteBadge);

export default router;
