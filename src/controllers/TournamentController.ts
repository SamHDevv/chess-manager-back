import { Request, Response } from "express";
import { TournamentService } from "../services/TournamentService";

export class TournamentController {
  private tournamentService: TournamentService;

  constructor() {
    this.tournamentService = new TournamentService();
  }

  // GET /tournaments
  getAllTournaments = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournaments = await this.tournamentService.getAllTournaments();
      res.status(200).json({
        success: true,
        data: tournaments,
        message: "Torneos obtenidos exitosamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener torneos",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // GET /tournaments/upcoming
  getUpcomingTournaments = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournaments = await this.tournamentService.getUpcomingTournaments();
      res.status(200).json({
        success: true,
        data: tournaments,
        message: "Torneos próximos obtenidos exitosamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener torneos próximos",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // GET /tournaments/:id
  getTournamentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const tournament = await this.tournamentService.getTournamentById(id);
      
      if (tournament) {
        res.status(200).json({
          success: true,
          data: tournament,
          message: "Torneo obtenido exitosamente"
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Torneo no encontrado"
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // POST /tournaments
  createTournament = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentData = req.body;
      
      const newTournament = await this.tournamentService.createTournament(tournamentData);
      
      res.status(201).json({
        success: true,
        data: newTournament,
        message: "Torneo creado exitosamente"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Error al crear torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // PUT /tournaments/:id
  updateTournament = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const updatedTournament = await this.tournamentService.updateTournament(id, updateData);
      
      if (updatedTournament) {
        res.status(200).json({
          success: true,
          data: updatedTournament,
          message: "Torneo actualizado exitosamente"
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Torneo no encontrado"
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Error al actualizar torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // DELETE /tournaments/:id
  deleteTournament = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const result = await this.tournamentService.deleteTournament(id);
      
      if (result) {
        res.status(200).json({
          success: true,
          message: "Torneo eliminado exitosamente"
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Torneo no encontrado"
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // PATCH /tournaments/:id/status
  updateTournamentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      if (!["upcoming", "ongoing", "finished", "cancelled"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Estado de torneo inválido. Debe ser: upcoming, ongoing, finished o cancelled"
        });
        return;
      }

      const tournament = await this.tournamentService.updateTournamentStatus(id, status);
      
      res.status(200).json({
        success: true,
        data: tournament,
        message: "Estado del torneo actualizado exitosamente"
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === "Torneo no encontrado" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Error al actualizar estado del torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };
}