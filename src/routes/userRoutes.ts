import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { AuthMiddleware } from "../middleware/authMiddleware";

const router = Router();
const userController = new UserController();
const authMiddleware = new AuthMiddleware();

// Ruta pública para listar jugadores (solo jugadores activos, sin info sensible)
router.get("/players", userController.getPlayers);

// Rutas de usuarios (protegidas)
router.get("/", authMiddleware.authenticate, authMiddleware.requireAdmin, userController.getAllUsers);
router.get("/:id", authMiddleware.authenticate, authMiddleware.requireOwnershipOrAdmin, userController.getUserById);
router.get("/:id/deletion-info", authMiddleware.authenticate, authMiddleware.requireOwnershipOrAdmin, userController.getUserDeletionInfo);
router.post("/", authMiddleware.authenticate, authMiddleware.requireAdmin, userController.createUser);
router.put("/:id", authMiddleware.authenticate, authMiddleware.requireOwnershipOrAdmin, userController.updateUser);
router.delete("/:id", authMiddleware.authenticate, authMiddleware.requireAdmin, userController.deleteUser);

export default router;