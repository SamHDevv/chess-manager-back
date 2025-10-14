import { Request, Response } from "express";
import { MatchService } from "../services/MatchService";

export class MatchController {
  private matchService: MatchService;

  constructor() {
    this.matchService = new MatchService();
  }

  getAllMatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const matches = await this.matchService.getAllMatches();
      res.status(200).json({
        success: true,
        data: matches,
        message: "Partidas obtenidas correctamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getMatchById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de partida inválido"
        });
        return;
      }

      const match = await this.matchService.getMatchById(id);
      
      if (!match) {
        res.status(404).json({
          success: false,
          message: "Partida no encontrada"
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: match,
        message: "Partida obtenida correctamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getMatchesByTournamentId = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      
      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const matches = await this.matchService.getMatchesByTournamentId(tournamentId);
      
      res.status(200).json({
        success: true,
        data: matches,
        message: "Partidas del torneo obtenidas correctamente"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Torneo no encontrado") {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getMatchesByRound = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      const round = parseInt(req.params.round);
      
      if (isNaN(tournamentId) || isNaN(round)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo o número de ronda inválido"
        });
        return;
      }

      const matches = await this.matchService.getMatchesByRound(tournamentId, round);
      
      res.status(200).json({
        success: true,
        data: matches,
        message: `Partidas de la ronda ${round} obtenidas correctamente`
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Torneo no encontrado",
          "El número de ronda debe ser mayor a 0"
        ];

        if (businessErrors.includes(error.message)) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getMatchesByPlayerId = async (req: Request, res: Response): Promise<void> => {
    try {
      const playerId = parseInt(req.params.playerId);
      
      if (isNaN(playerId)) {
        res.status(400).json({
          success: false,
          message: "ID de jugador inválido"
        });
        return;
      }

      const matches = await this.matchService.getMatchesByPlayerId(playerId);
      
      res.status(200).json({
        success: true,
        data: matches,
        message: "Partidas del jugador obtenidas correctamente"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Jugador no encontrado") {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getOngoingMatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const matches = await this.matchService.getOngoingMatches();
      res.status(200).json({
        success: true,
        data: matches,
        message: "Partidas en curso obtenidas correctamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tournamentId, whitePlayerId, blackPlayerId, round } = req.body;

      // Validar campos requeridos
      if (!tournamentId || !whitePlayerId || !blackPlayerId) {
        res.status(400).json({
          success: false,
          message: "Los campos 'tournamentId', 'whitePlayerId' y 'blackPlayerId' son obligatorios"
        });
        return;
      }

      // Validar tipos de datos
      if (typeof tournamentId !== "number" || typeof whitePlayerId !== "number" || typeof blackPlayerId !== "number") {
        res.status(400).json({
          success: false,
          message: "Los campos deben ser números válidos"
        });
        return;
      }

      if (round && typeof round !== "number") {
        res.status(400).json({
          success: false,
          message: "El campo 'round' debe ser un número válido"
        });
        return;
      }

      const newMatch = await this.matchService.createMatch({
        tournamentId,
        whitePlayerId,
        blackPlayerId,
        round
      });

      res.status(201).json({
        success: true,
        data: newMatch,
        message: "Partida creada correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Torneo no encontrado",
          "Solo se pueden crear partidas en torneos en curso",
          "Jugador con piezas blancas no encontrado",
          "Jugador con piezas negras no encontrado",
          "Un jugador no puede jugar contra sí mismo",
          "El jugador con piezas blancas no está inscrito en este torneo",
          "El jugador con piezas negras no está inscrito en este torneo"
        ];

        if (businessErrors.includes(error.message)) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  updateMatchResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { result } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de partida inválido"
        });
        return;
      }

      if (!result) {
        res.status(400).json({
          success: false,
          message: "El campo 'result' es obligatorio"
        });
        return;
      }

      const validResults = ["white_wins", "black_wins", "draw"];
      if (!validResults.includes(result)) {
        res.status(400).json({
          success: false,
          message: "Resultado inválido. Valores permitidos: white_wins, black_wins, draw"
        });
        return;
      }

      // Obtener userId del token JWT (viene del middleware de autenticación)
      const userId = (req as any).user?.userId;
      
      const updatedMatch = await this.matchService.updateMatchResult(id, result, userId);

      res.status(200).json({
        success: true,
        data: updatedMatch,
        message: "Resultado de la partida actualizado correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Partida no encontrada",
          "La partida ya tiene un resultado final"
        ];

        if (businessErrors.includes(error.message)) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }

        // Error de permisos
        if (error.message === "Solo el organizador del torneo puede actualizar los resultados") {
          res.status(403).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  startMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de partida inválido"
        });
        return;
      }

      const updatedMatch = await this.matchService.startMatch(id);

      res.status(200).json({
        success: true,
        data: updatedMatch,
        message: "Partida iniciada correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Partida no encontrada",
          "La partida ya ha sido iniciada"
        ];

        if (businessErrors.includes(error.message)) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  deleteMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de partida inválido"
        });
        return;
      }

      const deleted = await this.matchService.deleteMatch(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Partida no encontrada"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Partida eliminada correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Partida no encontrada",
          "Solo se pueden eliminar partidas que no han comenzado"
        ];

        if (businessErrors.includes(error.message)) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  generateRoundPairings = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      
      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const matches = await this.matchService.generateRoundPairings(tournamentId);

      res.status(201).json({
        success: true,
        data: matches,
        message: "Emparejamientos de ronda generados correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Torneo no encontrado",
          "Solo se pueden generar emparejamientos en torneos en curso",
          "Se necesitan al menos 2 jugadores para generar emparejamientos",
          "El número de jugadores debe ser par para generar emparejamientos"
        ];

        if (businessErrors.includes(error.message)) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getTournamentStandings = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      
      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const standings = await this.matchService.getTournamentStandings(tournamentId);

      res.status(200).json({
        success: true,
        data: standings,
        message: "Clasificación del torneo obtenida correctamente"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Torneo no encontrado") {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  /**
   * Verificar si el usuario actual es organizador del torneo
   */
  isUserTournamentOrganizer = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      const userId = (req as any).user?.userId; // Viene del middleware de autenticación
      
      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
        return;
      }

      const isOrganizer = await this.matchService.isUserTournamentOrganizer(userId, tournamentId);
      
      res.status(200).json({
        success: true,
        data: isOrganizer,
        message: isOrganizer ? "Usuario es organizador del torneo" : "Usuario no es organizador del torneo"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Torneo no encontrado") {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };
}