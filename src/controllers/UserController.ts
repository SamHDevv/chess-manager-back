import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { sanitizeUser } from "../utils/serializers";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // GET /users
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();
      // If the requester is an admin, include email and role so the admin UI can
      // show promote/demote and email. Authentication middleware should populate req.user.
      const currentUser = (req as any).user;
      const isAdmin = currentUser && currentUser.role === "admin";

      res.status(200).json({
        success: true,
        data: users.map(u => sanitizeUser(u, { includeEmail: !!isAdmin, includeRole: !!isAdmin })),
        message: "Users retrieved successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // GET /users/:id
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID"
        });
        return;
      }

  const user = await this.userService.getUserById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }

      const currentUser2 = (req as any).user;
      const isAdmin2 = currentUser2 && currentUser2.role === "admin";

      res.status(200).json({
        success: true,
        data: sanitizeUser(user as any, { includeEmail: !!isAdmin2, includeRole: !!isAdmin2, includeOriginalName: !!isAdmin2 }),
        message: "User retrieved successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // POST /users
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;
      
      const user = await this.userService.createUser({
        name,
        email,
        password,
        role
      });

      res.status(201).json({
        success: true,
        data: user,
        message: "User created successfully"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Error creating user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // PUT /users/:id
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID"
        });
        return;
      }

      const user = await this.userService.updateUser(id, req.body);
      
      res.status(200).json({
        success: true,
        data: user,
        message: "User updated successfully"
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === "User not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Error updating user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // GET /users/:id/deletion-info
  getUserDeletionInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID"
        });
        return;
      }

      const deletionInfo = await this.userService.getUserDeletionInfo(id);
      
      res.status(200).json({
        success: true,
        data: deletionInfo,
        message: "Deletion info retrieved successfully"
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === "Usuario no encontrado" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: "Error getting deletion info",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // DELETE /users/:id
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID"
        });
        return;
      }

      const deleted = await this.userService.deleteUser(id);
      
      res.status(200).json({
        success: true,
        data: { deleted },
        message: "Usuario eliminado correctamente. Las relaciones se han gestionado automáticamente."
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === "Usuario no encontrado" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: "Error deleting user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // GET /users/players (endpoint público para lista de jugadores)
  getPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();
      
      // Filtrar solo jugadores activos (no admins, no eliminados)
      const players = users.filter(u => u.role === 'player' && !u.isDeleted);
      
      // Sanitizar datos (sin email, solo info pública)
      const sanitizedPlayers = players.map(p => sanitizeUser(p, { includeRole: true }));

      res.status(200).json({
        success: true,
        data: sanitizedPlayers,
        message: "Players retrieved successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving players",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
}