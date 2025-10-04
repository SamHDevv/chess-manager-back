import { Router } from "express";
import { InscriptionController } from "../controllers/InscriptionController";

const router = Router();
const inscriptionController = new InscriptionController();

// GET /api/inscriptions - Obtener todas las inscripciones
router.get("/", inscriptionController.getAllInscriptions);

// GET /api/inscriptions/:id - Obtener inscripción por ID
router.get("/:id", inscriptionController.getInscriptionById);

// GET /api/inscriptions/user/:userId - Obtener inscripciones por usuario
router.get("/user/:userId", inscriptionController.getInscriptionsByUserId);

// GET /api/inscriptions/tournament/:tournamentId - Obtener inscripciones por torneo
router.get("/tournament/:tournamentId", inscriptionController.getInscriptionsByTournamentId);

// POST /api/inscriptions - Crear nueva inscripción
router.post("/", inscriptionController.createInscription);

// DELETE /api/inscriptions/:id - Eliminar inscripción por ID
router.delete("/:id", inscriptionController.deleteInscription);

// DELETE /api/inscriptions/cancel - Cancelar inscripción por usuario y torneo
router.delete("/cancel", inscriptionController.cancelInscriptionByUserAndTournament);

export default router;