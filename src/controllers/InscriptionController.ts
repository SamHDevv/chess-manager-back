import { Request, Response } from "express";
import { InscriptionService } from "../services/InscriptionService";

export class InscriptionController {
  private inscriptionService: InscriptionService;

  constructor() {
    this.inscriptionService = new InscriptionService();
  }

  getAllInscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const inscriptions = await this.inscriptionService.getAllInscriptions();
      res.status(200).json({
        success: true,
        data: inscriptions,
        message: "Inscripciones obtenidas correctamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getInscriptionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de inscripción inválido"
        });
        return;
      }

      const inscription = await this.inscriptionService.getInscriptionById(id);
      
      if (!inscription) {
        res.status(404).json({
          success: false,
          message: "Inscripción no encontrada"
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: inscription,
        message: "Inscripción obtenida correctamente"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };

  getInscriptionsByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "ID de usuario inválido"
        });
        return;
      }

      const inscriptions = await this.inscriptionService.getInscriptionsByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: inscriptions,
        message: "Inscripciones del usuario obtenidas correctamente"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Usuario no encontrado") {
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

  getInscriptionsByTournamentId = async (req: Request, res: Response): Promise<void> => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      
      if (isNaN(tournamentId)) {
        res.status(400).json({
          success: false,
          message: "ID de torneo inválido"
        });
        return;
      }

      const inscriptions = await this.inscriptionService.getInscriptionsByTournamentId(tournamentId);
      
      res.status(200).json({
        success: true,
        data: inscriptions,
        message: "Inscripciones del torneo obtenidas correctamente"
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

  createInscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tournamentId } = req.body;
      // El userId se obtiene del token de autenticación, no del body
      const userId = (req as any).user?.userId;

      // Validar autenticación
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Autenticación requerida"
        });
        return;
      }

      // Validar campo requerido
      if (!tournamentId) {
        res.status(400).json({
          success: false,
          message: "El campo 'tournamentId' es obligatorio"
        });
        return;
      }

      // Validar tipo de dato
      if (typeof tournamentId !== "number") {
        res.status(400).json({
          success: false,
          message: "El campo 'tournamentId' debe ser un número"
        });
        return;
      }

      const newInscription = await this.inscriptionService.createInscription({
        userId,
        tournamentId
      });

      res.status(201).json({
        success: true,
        data: newInscription,
        message: "Inscripción creada correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        // Manejar errores específicos de negocio
        const businessErrors = [
          "Usuario no encontrado",
          "Torneo no encontrado",
          "No se puede inscribir en un torneo que no esté próximo",
          "La fecha límite de inscripción ha pasado",
          "El usuario ya está inscrito en este torneo",
          "El torneo ha alcanzado el número máximo de participantes"
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

  deleteInscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "ID de inscripción inválido"
        });
        return;
      }

      const deleted = await this.inscriptionService.deleteInscription(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Inscripción no encontrada"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Inscripción eliminada correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Inscripción no encontrada",
          "No se puede cancelar la inscripción de un torneo que ya ha comenzado"
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

  cancelInscriptionByUserAndTournament = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tournamentId } = req.body;
      // El userId se obtiene del token de autenticación, no del body
      const userId = (req as any).user?.userId;

      // Validar autenticación
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Autenticación requerida"
        });
        return;
      }

      // Validar campo requerido
      if (!tournamentId) {
        res.status(400).json({
          success: false,
          message: "El campo 'tournamentId' es obligatorio"
        });
        return;
      }

      // Validar tipo de dato
      if (typeof tournamentId !== "number") {
        res.status(400).json({
          success: false,
          message: "El campo 'tournamentId' debe ser un número"
        });
        return;
      }

      const cancelled = await this.inscriptionService.cancelInscriptionByUserAndTournament(userId, tournamentId);
      
      if (!cancelled) {
        res.status(404).json({
          success: false,
          message: "Inscripción no encontrada"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Inscripción cancelada correctamente"
      });
    } catch (error) {
      if (error instanceof Error) {
        const businessErrors = [
          "Inscripción no encontrada",
          "No se puede cancelar la inscripción de un torneo que ya ha comenzado"
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
}