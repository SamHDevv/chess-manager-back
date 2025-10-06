import { Router } from "express";
import { TournamentController } from "../controllers/TournamentController";
import { AuthMiddleware } from "../middleware/authMiddleware";

const router = Router();
const tournamentController = new TournamentController();
const authMiddleware = new AuthMiddleware();

// Public Routes
router.get("/", authMiddleware.optionalAuth, tournamentController.getAllTournaments);
router.get("/upcoming", authMiddleware.optionalAuth, tournamentController.getUpcomingTournaments);
router.get("/:id", authMiddleware.optionalAuth, tournamentController.getTournamentById);


router.post("/", 
  authMiddleware.authenticate, 
  authMiddleware.requirePermission('create_tournaments'), 
  tournamentController.createTournament
);

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

router.delete("/:id", 
  authMiddleware.authenticate, 
  authMiddleware.requireAnyPermission(['delete_own_tournaments', 'delete_any_tournament']), 
  tournamentController.deleteTournament
);

export default router;