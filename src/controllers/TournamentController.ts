import { Request, Response } from "express";
import { TournamentService } from "../services/TournamentService";
import { RolePermissionService, UserRole } from "../utils/rolePermissions";

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
      
      // 🎯 NUEVO: Asignar el creador del torneo desde el token JWT
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
        return;
      }

      // Agregar el ID del creador a los datos del torneo
      const tournamentWithCreator = {
        ...tournamentData,
        createdBy: req.user.userId
      };
      
      const newTournament = await this.tournamentService.createTournament(tournamentWithCreator);
      
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
        return;
      }

      // 🔐 NUEVO: Verificar permisos antes de actualizar
      const tournament = await this.tournamentService.getTournamentById(id);
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: "Torneo no encontrado"
        });
        return;
      }

      // Verificar si el usuario puede editar este torneo
      // Si no hay createdBy (torneos legacy), solo admins pueden editar
      const tournamentCreatorId = tournament.createdBy || 0;
      const canEdit = RolePermissionService.canPerformTournamentAction(
        req.user.role as UserRole,
        req.user.userId,
        tournamentCreatorId,
        'edit'
      );

      if (!canEdit) {
        res.status(403).json({
          success: false,
          message: "No tienes permisos para editar este torneo"
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

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
        return;
      }

      // 🔐 NUEVO: Verificar permisos antes de eliminar
      const tournament = await this.tournamentService.getTournamentById(id);
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: "Torneo no encontrado"
        });
        return;
      }

      // Verificar si el usuario puede eliminar este torneo
      // Si no hay createdBy (torneos legacy), solo admins pueden eliminar
      const tournamentCreatorId = tournament.createdBy || 0;
      const canDelete = RolePermissionService.canPerformTournamentAction(
        req.user.role as UserRole,
        req.user.userId,
        tournamentCreatorId,
        'delete'
      );

      if (!canDelete) {
        res.status(403).json({
          success: false,
          message: "No tienes permisos para eliminar este torneo"
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

  // POST /tournaments/:id/generate-matches - Generar partidas con sistema Suizo
  generateMatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
        return;
      }

      const userId = req.user.userId;
      
      // Verificar que el usuario sea organizador o admin
      const tournament = await this.tournamentService.getTournamentById(tournamentId);
      
      if (!tournament) {
        res.status(404).json({
          success: false,
          message: "Torneo no encontrado"
        });
        return;
      }
      
      const isAdmin = req.user.role === 'admin';
      const isOrganizer = tournament.createdBy === userId;
      
      if (!isAdmin && !isOrganizer) {
        res.status(403).json({
          success: false,
          message: "No tienes permisos para generar partidas. Solo el organizador o un administrador pueden hacerlo."
        });
        return;
      }
      
      // Generar las partidas usando el sistema Suizo
      const matches = await this.tournamentService.generateMatches(tournamentId);
      
      res.status(200).json({
        success: true,
        message: `Se generaron ${matches.length} partidas correctamente para la ronda ${matches[0]?.round || 1}`,
        data: matches
      });
      
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Torneo no encontrado",
          "Solo se pueden generar partidas para torneos en progreso",
          "Se necesitan al menos 2 participantes para generar partidas",
          "Hay partidas pendientes en la ronda anterior"
        ];

        if (businessErrors.some(msg => error.message.includes(msg))) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error al generar partidas",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // POST /tournaments/:id/start - Iniciar torneo manualmente
  startTournament = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.id);

      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const tournament = await this.tournamentService.startTournament(tournamentId);

      res.status(200).json({
        success: true,
        data: tournament,
        message: "Torneo iniciado exitosamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Torneo no encontrado",
          "No se puede iniciar un torneo",
          "Se requieren al menos 2 participantes"
        ];

        if (businessErrors.some(msg => error.message.includes(msg))) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error al iniciar torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  // POST /tournaments/:id/finish - Finalizar torneo manualmente
  finishTournament = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.id);

      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const tournament = await this.tournamentService.finishTournament(tournamentId);

      res.status(200).json({
        success: true,
        data: tournament,
        message: "Torneo finalizado exitosamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Torneo no encontrado",
          "No se puede finalizar un torneo"
        ];

        if (businessErrors.some(msg => error.message.includes(msg))) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Error al finalizar torneo",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
