import { Router } from "express";
import { TournamentController } from "../controllers/TournamentController";

const router = Router();
const tournamentController = new TournamentController();

// Rutas de torneos
router.get("/", tournamentController.getAllTournaments);
router.get("/upcoming", tournamentController.getUpcomingTournaments);
router.get("/:id", tournamentController.getTournamentById);
router.post("/", tournamentController.createTournament);
router.put("/:id", tournamentController.updateTournament);
router.delete("/:id", tournamentController.deleteTournament);
router.patch("/:id/status", tournamentController.updateTournamentStatus);

export default router;