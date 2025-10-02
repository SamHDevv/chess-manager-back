import { Request, Response } from "express";
import { UserService } from "../services/UserService";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // GET /users
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();
      res.status(200).json({
        success: true,
        data: users,
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

      res.status(200).json({
        success: true,
        data: user,
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
        message: "User deleted successfully"
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === "User not found" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: "Error deleting user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
}