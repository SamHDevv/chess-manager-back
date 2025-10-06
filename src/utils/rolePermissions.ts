// Definición de tipos de roles (simplificado a 2 roles)
export type UserRole = 'player' | 'admin';

// Definición de permisos disponibles (sistema simplificado)
export type Permission = 
  // Permisos básicos de jugador
  | 'view_tournaments'
  | 'join_tournaments'
  | 'view_matches'
  | 'view_rankings'
  | 'view_own_profile'
  | 'edit_own_profile'
  
  // Permisos de gestión de torneos (disponibles para players)
  | 'create_tournaments'
  | 'edit_own_tournaments'
  | 'delete_own_tournaments'
  | 'manage_own_tournament_inscriptions'
  | 'create_own_matches'
  | 'update_own_match_results'
  | 'publish_own_results'
  | 'view_own_tournament_analytics'
  
  // Permisos de administrador (control total)
  | 'manage_users'
  | 'change_user_roles'
  | 'edit_any_tournament'
  | 'delete_any_tournament'
  | 'manage_any_tournament_inscriptions'
  | 'create_any_matches'
  | 'update_any_match_results'
  | 'view_system_analytics'
  | 'manage_system_settings'
  | 'access_admin_panel';

// Configuración de permisos por rol (sistema democrático)
const PLAYER_PERMISSIONS: Permission[] = [
  // Permisos básicos
  'view_tournaments',
  'join_tournaments',
  'view_matches',
  'view_rankings',
  'view_own_profile',
  'edit_own_profile',
  
  // 🎯 NUEVO: Players pueden crear y gestionar sus propios torneos
  'create_tournaments',
  'edit_own_tournaments',
  'delete_own_tournaments',
  'manage_own_tournament_inscriptions',
  'create_own_matches',
  'update_own_match_results',
  'publish_own_results',
  'view_own_tournament_analytics'
];

const ADMIN_PERMISSIONS: Permission[] = [
  // Hereda todos los permisos de player
  ...PLAYER_PERMISSIONS,
  
  // Permisos adicionales de administrador (control total)
  'manage_users',
  'change_user_roles',
  'edit_any_tournament',      // Puede editar cualquier torneo
  'delete_any_tournament',    // Puede eliminar cualquier torneo
  'manage_any_tournament_inscriptions',
  'create_any_matches',
  'update_any_match_results',
  'view_system_analytics',
  'manage_system_settings',
  'access_admin_panel'
];

// Mapeo de roles a permisos
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  player: PLAYER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS
};

// Jerarquía de roles simplificada
const ROLE_HIERARCHY: Record<UserRole, number> = {
  player: 1,
  admin: 2
};

export class RolePermissionService {
  /**
   * Verifica si un usuario tiene un permiso específico
   */
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return rolePermissions.includes(permission);
  }

  /**
   * Verifica si un usuario tiene todos los permisos especificados
   */
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Verifica si un usuario tiene al menos uno de los permisos especificados
   */
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Obtiene todos los permisos de un rol
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Verifica si un rol es superior o igual a otro en la jerarquía
   */
  static isRoleEqualOrHigher(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  }

  /**
   * Verifica si un rol es superior a otro en la jerarquía
   */
  static isRoleHigher(userRole: UserRole, compareRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[compareRole];
  }

  /**
   * Verifica si un usuario puede cambiar el rol de otro usuario
   */
  static canChangeUserRole(changerRole: UserRole, targetRole: UserRole, newRole: UserRole): boolean {
    // Solo admins pueden cambiar roles
    return changerRole === 'admin';
  }

  /**
   * Valida si un rol es válido
   */
  static isValidRole(role: string): role is UserRole {
    return ['player', 'admin'].includes(role as UserRole);
  }

  /**
   * Verifica si un usuario puede gestionar un torneo específico
   * (es el creador del torneo o es admin)
   */
  static canManageTournament(userRole: UserRole, userId: number, tournamentCreatorId: number): boolean {
    // Los admins pueden gestionar cualquier torneo
    if (userRole === 'admin') {
      return true;
    }
    
    // Los players solo pueden gestionar sus propios torneos
    return userId === tournamentCreatorId;
  }

  /**
   * Verifica si un usuario puede realizar una acción específica en un torneo
   */
  static canPerformTournamentAction(
    userRole: UserRole, 
    userId: number, 
    tournamentCreatorId: number, 
    action: 'edit' | 'delete' | 'manage_inscriptions' | 'create_matches' | 'update_results'
  ): boolean {
    const isAdmin = userRole === 'admin';
    const isOwner = userId === tournamentCreatorId;
    
    switch (action) {
      case 'edit':
        return isAdmin || (isOwner && this.hasPermission(userRole, 'edit_own_tournaments'));
      
      case 'delete':
        return isAdmin || (isOwner && this.hasPermission(userRole, 'delete_own_tournaments'));
      
      case 'manage_inscriptions':
        return isAdmin || (isOwner && this.hasPermission(userRole, 'manage_own_tournament_inscriptions'));
      
      case 'create_matches':
        return isAdmin || (isOwner && this.hasPermission(userRole, 'create_own_matches'));
      
      case 'update_results':
        return isAdmin || (isOwner && this.hasPermission(userRole, 'update_own_match_results'));
      
      default:
        return false;
    }
  }
}