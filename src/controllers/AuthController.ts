import { Request, Response } from 'express';
import { AuthService, LoginCredentials, RegisterData } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Registrar nuevo usuario
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role }: RegisterData = req.body;

      // Validaciones básicas
      if (!name || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son requeridos'
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Formato de email inválido'
        });
        return;
      }

      // Registrar usuario
      const result = await this.authService.register({
        name,
        email,
        password,
        role: role || 'player'
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error en el registro'
      });
    }
  };

  /**
   * Iniciar sesión
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password }: LoginCredentials = req.body;

      // Validaciones básicas
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
        return;
      }

      // Intentar login
      const result = await this.authService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: result
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error en el inicio de sesión'
      });
    }
  };

  /**
   * Obtener perfil del usuario autenticado
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const user = await this.authService.getUserById(req.user.userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: { user }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Verificar token (útil para el frontend)
   */
  verifyToken = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token válido',
        data: {
          user: req.user
        }
      });

    } catch (error) {
      console.error('Error verificando token:', error);
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  };

  /**
   * Cerrar sesión (opcional - principalmente para documentación)
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    // Con JWT no hay mucho que hacer en el servidor para logout
    // El frontend debe eliminar el token
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  };
}