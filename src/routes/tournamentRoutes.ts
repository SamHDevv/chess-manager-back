import { Router } from "express";
import { TournamentController } from "../controllers/TournamentController";
import { AuthMiddleware } from "../middleware/authMiddleware";

const router = Router();
const tournamentController = new TournamentController();
const authMiddleware = new AuthMiddleware();

// Rutas públicas (solo lectura) - cualquiera puede ver torneos
router.get("/", authMiddleware.optionalAuth, tournamentController.getAllTournaments);
router.get("/upcoming", authMiddleware.optionalAuth, tournamentController.getUpcomingTournaments);
router.get("/:id", authMiddleware.optionalAuth, tournamentController.getTournamentById);

// 🎯 NUEVO: Cualquier player autenticado puede crear torneos
router.post("/", 
  authMiddleware.authenticate, 
  authMiddleware.requirePermission('create_tournaments'), 
  tournamentController.createTournament
);

// 🔐 Solo el creador del torneo o admin pueden editarlo
router.put("/:id", 
  authMiddleware.authenticate, 
  authMiddleware.requireAnyPermission(['edit_own_tournaments', 'edit_any_tournament']), 
  tournamentController.updateTournament
);

router.patch("/:id/status", 
  authMiddleware.authenticate, 
  authMiddleware.requireAnyPermission(['edit_own_tournaments', 'edit_any_tournament']), 
  tournamentController.updateTournamentStatus
);

// 🗑️ Solo el creador del torneo o admin pueden eliminarlo
router.delete("/:id", 
  authMiddleware.authenticate, 
  authMiddleware.requireAnyPermission(['delete_own_tournaments', 'delete_any_tournament']), 
  tournamentController.deleteTournament
);

export default router;