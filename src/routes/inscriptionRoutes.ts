import { Router } from "express";
import { InscriptionController } from "../controllers/InscriptionController";
import { AuthMiddleware } from "../middleware/authMiddleware";

const router = Router();
const inscriptionController = new InscriptionController();
const authMiddleware = new AuthMiddleware();

// GET /api/inscriptions - Obtener todas las inscripciones (protegido - admin)
router.get("/", authMiddleware.authenticate, authMiddleware.requireAdmin, inscriptionController.getAllInscriptions);

// GET /api/inscriptions/:id - Obtener inscripción por ID (protegido)
router.get("/:id", authMiddleware.authenticate, inscriptionController.getInscriptionById);

// GET /api/inscriptions/user/:userId - Obtener inscripciones por usuario (protegido)
router.get("/user/:userId", authMiddleware.authenticate, inscriptionController.getInscriptionsByUserId);

// GET /api/inscriptions/tournament/:tournamentId - Obtener inscripciones por torneo (protegido)
router.get("/tournament/:tournamentId", authMiddleware.authenticate, inscriptionController.getInscriptionsByTournamentId);

// POST /api/inscriptions - Crear nueva inscripción (protegido - el userId se toma del token)
router.post("/", authMiddleware.authenticate, inscriptionController.createInscription);

// DELETE /api/inscriptions/:id - Eliminar inscripción por ID (protegido - admin)
router.delete("/:id", authMiddleware.authenticate, authMiddleware.requireAdmin, inscriptionController.deleteInscription);

// DELETE /api/inscriptions/cancel - Cancelar inscripción por usuario y torneo (protegido - el userId se toma del token)
router.delete("/cancel", authMiddleware.authenticate, inscriptionController.cancelInscriptionByUserAndTournament);

export default router;