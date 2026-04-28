import { Router } from "express";

import authRoutes from "./authRoutes.js";
import collectionRoutes from "./collectionRoutes.js";
import promptRoutes from "./promptRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/prompts", promptRoutes);
router.use("/collections", collectionRoutes);
router.use("/user", userRoutes);

export default router;

