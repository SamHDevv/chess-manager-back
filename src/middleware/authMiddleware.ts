import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { RolePermissionService, Permission, UserRole } from '../utils/rolePermissions';

// Extender la interfaz Request para incluir información del usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware para verificar JWT token
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Obtener el token del header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          success: false, 
          message: 'Token de acceso requerido' 
        });
        return;
      }

      const token = authHeader.substring(7); // Remover 'Bearer ' del inicio

      // Verificar el token
      const decoded = this.authService.verifyToken(token);

      // Verificar que el usuario existe
      const user = await this.authService.getUserById(decoded.userId);
      if (!user) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
        return;
      }

      // Agregar información del usuario al request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Token inválido' 
      });
    }
  };

  /**
   * Middleware para verificar rol de administrador
   */
  requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Autenticación requerida' 
      });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requieren permisos de administrador' 
      });
      return;
    }

    next();
  };

  /**
   * Middleware para verificar que el usuario está accediendo a sus propios datos
   * o es administrador
   */
  requireOwnershipOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Autenticación requerida' 
      });
      return;
    }

    const resourceUserId = parseInt(req.params.userId || req.params.id);
    const isOwner = req.user.userId === resourceUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Solo puedes acceder a tus propios datos' 
      });
      return;
    }

    next();
  };

  /**
   * Middleware opcional - no requiere autenticación pero la procesa si está presente
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = this.authService.verifyToken(token);
        
        const user = await this.authService.getUserById(decoded.userId);
        if (user) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
          };
        }
      }
    } catch (error) {
      // Ignorar errores en autenticación opcional
    }

    next();
  };

  /**
   * Middleware para verificar un permiso específico
   */
  requirePermission = (permission: Permission) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          message: 'Autenticación requerida' 
        });
        return;
      }

      const hasPermission = RolePermissionService.hasPermission(
        req.user.role as UserRole, 
        permission
      );

      if (!hasPermission) {
        res.status(403).json({ 
          success: false, 
          message: `Acceso denegado. Se requiere el permiso: ${permission}` 
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware para verificar múltiples permisos (requiere AL MENOS UNO)
   */
  requireAnyPermission = (permissions: Permission[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ 
          success: false, 
          message: 'Autenticación requerida' 
        });
        return;
      }

      const hasAnyPermission = RolePermissionService.hasAnyPermission(
        req.user.role as UserRole, 
        permissions
      );

      if (!hasAnyPermission) {
        res.status(403).json({ 
          success: false, 
          message: `Acceso denegado. Se requiere al menos uno de estos permisos: ${permissions.join(', ')}` 
        });
        return;
      }

      next();
    };
  };
}