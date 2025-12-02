import { Router } from "express";
import { MatchController } from "../controllers/MatchController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const matchController = new MatchController();

// GET /api/matches - Obtener todas las partidas
router.get("/", matchController.getAllMatches);

// GET /api/matches/ongoing - Obtener partidas en curso
router.get("/ongoing", matchController.getOngoingMatches);

// GET /api/matches/:id - Obtener partida por ID
router.get("/:id", matchController.getMatchById);

// GET /api/matches/tournament/:tournamentId - Obtener partidas por torneo
router.get("/tournament/:tournamentId", matchController.getMatchesByTournamentId);

// GET /api/matches/tournament/:tournamentId/round/:round - Obtener partidas por ronda
router.get("/tournament/:tournamentId/round/:round", matchController.getMatchesByRound);

// GET /api/matches/player/:playerId - Obtener partidas por jugador
router.get("/player/:playerId", matchController.getMatchesByPlayerId);

// GET /api/matches/tournament/:tournamentId/standings - Obtener clasificación del torneo
router.get("/tournament/:tournamentId/standings", matchController.getTournamentStandings);

// GET /api/matches/tournament/:tournamentId/is-organizer - Verificar si usuario es organizador
router.get("/tournament/:tournamentId/is-organizer", authMiddleware.authenticate, matchController.isUserTournamentOrganizer);

// POST /api/matches - Crear nueva partida
router.post("/", authMiddleware.authenticate, matchController.createMatch);

// POST /api/matches/tournament/:tournamentId/generate-pairings - Generar emparejamientos de ronda
router.post("/tournament/:tournamentId/generate-pairings", authMiddleware.authenticate, matchController.generateRoundPairings);

// PATCH /api/matches/:id/result - Actualizar resultado de partida
router.patch("/:id/result", authMiddleware.authenticate, matchController.updateMatchResult);

// PUT /api/matches/:id/result - Actualizar resultado de partida (alias para compatibilidad con frontend)
router.put("/:id/result", authMiddleware.authenticate, matchController.updateMatchResult);

// PATCH /api/matches/:id/start - Iniciar partida
router.patch("/:id/start", matchController.startMatch);

// DELETE /api/matches/:id - Eliminar partida
router.delete("/:id", matchController.deleteMatch);

export default router;